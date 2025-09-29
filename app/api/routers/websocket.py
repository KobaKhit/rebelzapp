from __future__ import annotations

import json
from typing import Dict, List, Set

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import ChatGroupMember, User
from app.schemas.chat import (
    ChatMessageWebSocket,
    TypingWebSocket,
    UserJoinedWebSocket,
    UserLeftWebSocket,
    WebSocketMessage,
)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # Store active connections by group_id -> set of websockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store user info for each websocket
        self.websocket_users: Dict[WebSocket, User] = {}

    async def connect(self, websocket: WebSocket, group_id: int, user: User):
        await websocket.accept()
        
        if group_id not in self.active_connections:
            self.active_connections[group_id] = set()
        
        self.active_connections[group_id].add(websocket)
        self.websocket_users[websocket] = user

        # Notify other users that someone joined
        await self.broadcast_to_group(
            group_id,
            UserJoinedWebSocket(user=user, group_id=group_id).model_dump(),
            exclude=websocket,
        )

    def disconnect(self, websocket: WebSocket, group_id: int):
        user = self.websocket_users.get(websocket)
        
        if group_id in self.active_connections:
            self.active_connections[group_id].discard(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]
        
        if websocket in self.websocket_users:
            del self.websocket_users[websocket]

        return user

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            # Connection might be closed
            pass

    async def broadcast_to_group(self, group_id: int, message: dict, exclude: WebSocket = None):
        if group_id not in self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections[group_id].copy():
            if connection == exclude:
                continue
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                # Connection is closed, mark for removal
                disconnected.add(connection)

        # Clean up disconnected websockets
        for connection in disconnected:
            self.active_connections[group_id].discard(connection)
            if connection in self.websocket_users:
                del self.websocket_users[connection]


manager = ConnectionManager()


async def get_websocket_user(token: str, db: Session) -> User | None:
    """Get user from WebSocket token."""
    try:
        from app.services.security import decode_access_token
        from jose import JWTError
        
        payload = decode_access_token(token)
        sub = payload.get("sub")
        if sub is None:
            return None
            
        user = db.get(User, int(sub))
        if user is None or not user.is_active:
            return None
            
        return user
    except JWTError:
        return None


@router.websocket("/chat/{group_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    group_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """WebSocket endpoint for real-time chat."""
    # Accept the connection first
    await websocket.accept()
    
    try:
        # Authenticate user
        user = await get_websocket_user(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Check if user is a member of the group
        membership = (
            db.query(ChatGroupMember)
            .filter(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == user.id,
            )
            .first()
        )

        if not membership:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Add to connection manager
        if group_id not in manager.active_connections:
            manager.active_connections[group_id] = set()
        
        manager.active_connections[group_id].add(websocket)
        manager.websocket_users[websocket] = user

        # Notify other users that someone joined
        await manager.broadcast_to_group(
            group_id,
            UserJoinedWebSocket(user=user, group_id=group_id).model_dump(mode='json'),
            exclude=websocket,
        )
    except Exception:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type", "")

                if message_type == "typing":
                    # Handle typing indicator
                    typing_message = TypingWebSocket(
                        user=user,
                        group_id=group_id,
                        is_typing=message_data.get("is_typing", False),
                    )
                    await manager.broadcast_to_group(
                        group_id,
                        typing_message.model_dump(mode='json'),
                        exclude=websocket,
                    )

                elif message_type == "message":
                    # Handle new message - this would typically be handled by the REST API
                    # but we can echo it back to all connected clients
                    from app.models import ChatMessage
                    from app.schemas.chat import ChatMessage as ChatMessageSchema
                    
                    # Create message in database
                    db_message = ChatMessage(
                        group_id=group_id,
                        sender_id=user.id,
                        content=message_data.get("content", ""),
                        message_type=message_data.get("message_type", "text"),
                    )
                    db.add(db_message)
                    db.commit()
                    db.refresh(db_message)

                    # Load sender information
                    db_message = (
                        db.query(ChatMessage)
                        .filter(ChatMessage.id == db_message.id)
                        .options(joinedload(ChatMessage.sender))
                        .first()
                    )

                    # Broadcast to all group members
                    message_schema = ChatMessageSchema.model_validate(db_message)
                    ws_message = ChatMessageWebSocket(message=message_schema)
                    await manager.broadcast_to_group(
                        group_id,
                        ws_message.model_dump(mode='json'),  # Use JSON serialization mode
                    )

            except json.JSONDecodeError:
                # Invalid JSON, ignore
                continue
            except Exception:
                # Error processing message, continue listening
                continue

    except WebSocketDisconnect:
        # User disconnected
        user = manager.disconnect(websocket, group_id)
        if user:
            # Notify other users that someone left
            await manager.broadcast_to_group(
                group_id,
                UserLeftWebSocket(user=user, group_id=group_id).model_dump(mode='json'),
            )
