from __future__ import annotations

import json
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import User, Event, EventRegistration
from app.services.llm import RebelzAgent

router = APIRouter()

async def get_current_user_optional(
    authorization: Optional[str],
    db: Session
) -> Optional[User]:
    """Get current user if token is provided, otherwise return None"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    try:
        from app.services.security import decode_access_token
        token = authorization.replace("Bearer ", "")
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id:
            user = db.get(User, int(user_id))
            if user and user.is_active:
                return user
    except Exception as e:
        print(f"Optional auth error: {e}")
    
    return None

@router.get("/copilotkit")
async def copilotkit_sse(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """CopilotKit Server-Sent Events endpoint for real-time communication"""
    # Get current user if authenticated
    current_user = await get_current_user_optional(authorization, db)
    
    async def event_stream():
        try:
            # Send initial connection event
            connection_data = {
                'type': 'connection',
                'data': {
                    'status': 'connected',
                    'authenticated': current_user is not None
                }
            }
            if current_user:
                connection_data['data']['user'] = current_user.email
            
            yield f"data: {json.dumps(connection_data)}\n\n"
            
            # Keep connection alive with heartbeat
            while True:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                heartbeat_data = {
                    'type': 'heartbeat',
                    'data': {
                        'timestamp': 'now',
                        'authenticated': current_user is not None
                    }
                }
                yield f"data: {json.dumps(heartbeat_data)}\n\n"
        except asyncio.CancelledError:
            # Connection closed by client
            print(f"CopilotKit SSE connection closed for user: {current_user.email if current_user else 'anonymous'}")
        except Exception as e:
            print(f"CopilotKit SSE error: {e}")
            error_data = {'type': 'error', 'data': {'message': str(e)}}
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control, Authorization",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@router.post("/copilotkit")
async def copilotkit_runtime(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """CopilotKit runtime endpoint for handling actions and chat"""
    # Get current user if authenticated
    current_user = await get_current_user_optional(authorization, db)
    
    try:
        body = await request.json()
        
        # Handle CopilotKit protocol - it sends different message formats
        # Check for CopilotKit standard message format
        if "messages" in body:
            return await handle_copilotkit_chat(body, current_user, db)
        elif "action" in body:
            return await handle_copilotkit_action(body, current_user, db)
        elif body.get("type") == "suggestions" or "text" in body:
            # Handle autosuggestion requests
            return await handle_copilotkit_suggestions(body, current_user, db)
        else:
            # Default response for CopilotKit initialization
            return JSONResponse({
                "status": "ready",
                "authenticated": current_user is not None,
                "user": current_user.email if current_user else None
            })
            
    except Exception as e:
        print(f"CopilotKit runtime error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"CopilotKit runtime error: {str(e)}"}
        )

async def handle_copilotkit_action(body: Dict[str, Any], user: Optional[User], db: Session) -> Dict[str, Any]:
    """Handle CopilotKit action requests"""
    if not user:
        return {"success": False, "error": "Authentication required for actions"}
    
    action_name = body.get("action")
    parameters = body.get("parameters", {})
    
    if action_name == "createEvent":
        return await create_event_action(parameters, user, db)
    elif action_name == "searchEvents":
        return await search_events_action(parameters, user, db)
    elif action_name == "registerForEvent":
        return await register_for_event_action(parameters, user, db)
    else:
        return {"success": False, "error": f"Unknown action: {action_name}"}

async def create_event_action(params: Dict[str, Any], user: User, db: Session) -> Dict[str, Any]:
    """Create a new event via CopilotKit action"""
    try:
        from app.models.event import Event
        from datetime import datetime
        
        # Parse parameters
        title = params.get("title")
        description = params.get("description")
        event_type = params.get("eventType")
        start_datetime = datetime.fromisoformat(params.get("startDateTime").replace("Z", "+00:00"))
        end_datetime = datetime.fromisoformat(params.get("endDateTime").replace("Z", "+00:00"))
        
        # Create the event
        new_event = Event(
            title=title,
            description=description,
            type=event_type,  # Fixed field name
            start_time=start_datetime,  # Fixed field name
            end_time=end_datetime,  # Fixed field name
            created_by_user_id=user.id,  # Fixed field name
            capacity=50,  # Fixed field name
            is_published=True  # Fixed field name
        )
        
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        
        return {
            "success": True,
            "data": {
                "id": new_event.id,
                "title": new_event.title,
                "message": f"Successfully created event '{title}' with ID {new_event.id}"
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Failed to create event: {str(e)}"}

async def search_events_action(params: Dict[str, Any], user: User, db: Session) -> Dict[str, Any]:
    """Search for events via CopilotKit action"""
    try:
        from sqlalchemy import or_
        
        query = db.query(Event).filter(Event.is_published == True)
        
        # Apply search filters
        search_term = params.get("query")
        event_type = params.get("eventType")
        
        if search_term:
            query = query.filter(
                or_(
                    Event.title.ilike(f"%{search_term}%"),
                    Event.description.ilike(f"%{search_term}%")
                )
            )
        
        if event_type:
            query = query.filter(Event.type == event_type)
        
        events = query.limit(10).all()
        
        return {
            "success": True,
            "data": {
                "events": [
                    {
                        "id": event.id,
                        "title": event.title,
                        "description": event.description,
                        "event_type": event.type,
                        "start_datetime": event.start_time.isoformat(),
                        "end_datetime": event.end_time.isoformat()
                    }
                    for event in events
                ],
                "count": len(events),
                "message": f"Found {len(events)} events matching your criteria"
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Failed to search events: {str(e)}"}

async def register_for_event_action(params: Dict[str, Any], user: User, db: Session) -> Dict[str, Any]:
    """Register user for an event via CopilotKit action"""
    try:
        event_id = params.get("eventId")
        
        # Check if event exists
        event = db.query(Event).filter(Event.id == event_id, Event.is_active == True).first()
        if not event:
            return {"success": False, "error": "Event not found"}
        
        # Check if already registered
        existing_registration = db.query(EventRegistration).filter(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == user.id
        ).first()
        
        if existing_registration:
            return {"success": False, "error": "Already registered for this event"}
        
        # Create registration
        registration = EventRegistration(
            event_id=event_id,
            user_id=user.id,
            registration_status="registered"
        )
        
        db.add(registration)
        db.commit()
        
        return {
            "success": True,
            "data": {
                "registration_id": registration.id,
                "event_title": event.title,
                "message": f"Successfully registered for '{event.title}'"
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Failed to register for event: {str(e)}"}

async def handle_copilotkit_chat(body: Dict[str, Any], user: Optional[User], db: Session) -> Dict[str, Any]:
    """Handle CopilotKit chat requests"""
    try:
        messages = body.get("messages", [])
        
        # Use the RebelzAgent for chat
        agent = RebelzAgent()
        
        # Get the last user message
        user_message = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_message = msg.get("content")
                break
        
        if not user_message:
            return {"success": False, "error": "No user message found"}
        
        # Process with the agent (works with or without user context)
        response = await agent.run(user_message, user=user, db=db)
        
        # Return response in CopilotKit expected format
        return {
            "messages": messages + [{
                "role": "assistant",
                "content": str(response) if not isinstance(response, dict) else response.get("content", str(response))
            }]
        }
        
    except Exception as e:
        print(f"Chat processing error: {str(e)}")
        return {
            "messages": messages + [{
                "role": "assistant", 
                "content": f"Sorry, I encountered an error: {str(e)}"
            }]
        }

async def handle_copilotkit_suggestions(body: Dict[str, Any], user: Optional[User], db: Session) -> Dict[str, Any]:
    """Handle CopilotKit autosuggestion requests"""
    try:
        # For now, return empty suggestions to avoid network errors
        # In the future, you could implement actual AI-powered suggestions
        text = body.get("text", "")
        
        # Return empty suggestions to prevent "[Network] No content" errors
        return {
            "suggestions": []
        }
        
    except Exception as e:
        print(f"Suggestions processing error: {str(e)}")
        return {
            "suggestions": []
        }
