from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import ChatGroup, ChatGroupMember, ChatMessage, User
from app.utils.permissions import is_admin_or_instructor
from app.schemas.chat import (
    ChatGroup as ChatGroupSchema,
    ChatGroupCreate,
    ChatGroupMemberCreate,
    ChatGroupUpdate,
    ChatMessage as ChatMessageSchema,
    ChatMessageCreate,
    WebSocketMessage,
)

router = APIRouter()


# Chat Groups
@router.post("/groups", response_model=ChatGroupSchema, status_code=status.HTTP_201_CREATED)
async def create_chat_group(
    group_data: ChatGroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new chat group."""
    # Create the group (user-created groups only)
    db_group = ChatGroup(
        name=group_data.name,
        description=group_data.description,
        is_private=group_data.is_private,
        group_type="user_created",
        created_by_id=current_user.id,
    )
    db.add(db_group)
    db.flush()  # Get the ID

    # Add creator as admin member
    db_member = ChatGroupMember(
        group_id=db_group.id,
        user_id=current_user.id,
        is_admin=True,
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_group)

    return db_group


@router.get("/groups", response_model=List[ChatGroupSchema])
async def get_user_chat_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all chat groups the current user is a member of."""
    groups = (
        db.query(ChatGroup)
        .join(ChatGroupMember)
        .filter(ChatGroupMember.user_id == current_user.id)
        .options(
            joinedload(ChatGroup.created_by),
            joinedload(ChatGroup.managed_by),
            joinedload(ChatGroup.members).joinedload(ChatGroupMember.user),
        )
        .all()
    )

    # Add member count to each group
    for group in groups:
        group.member_count = len(group.members)

    return groups


@router.get("/groups/{group_id}", response_model=ChatGroupSchema)
async def get_chat_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific chat group."""
    # Check if user is a member
    membership = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == current_user.id,
            )
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )

    group = (
        db.query(ChatGroup)
        .filter(ChatGroup.id == group_id)
        .options(
            joinedload(ChatGroup.created_by),
            joinedload(ChatGroup.managed_by),
            joinedload(ChatGroup.members).joinedload(ChatGroupMember.user),
        )
        .first()
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    group.member_count = len(group.members)
    return group


@router.put("/groups/{group_id}", response_model=ChatGroupSchema)
async def update_chat_group(
    group_id: int,
    group_data: ChatGroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a chat group (admin only, user-created groups only)."""
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    # Only allow updates to user-created groups
    if group.group_type != "user_created":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only user-created groups can be updated through this endpoint",
        )

    # Check if user is an admin of the group
    membership = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == current_user.id,
                ChatGroupMember.is_admin == True,
            )
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an admin to update this group",
        )

    # Update fields
    update_data = group_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)

    db.commit()
    db.refresh(group)
    return group


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat group (creator only, user-created groups only)."""
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    # Only allow deletion of user-created groups
    if group.group_type != "user_created":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only user-created groups can be deleted through this endpoint",
        )

    if group.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can delete the group",
        )

    db.delete(group)
    db.commit()


# Group Members
@router.post("/groups/{group_id}/members", status_code=status.HTTP_201_CREATED)
async def add_group_member(
    group_id: int,
    member_data: ChatGroupMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a member to a chat group (admin only, user-created groups only)."""
    # Check if group exists and is user-created
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.group_type != "user_created":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members can only be added to user-created groups through this endpoint",
        )

    # Check if current user is an admin
    membership = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == current_user.id,
                ChatGroupMember.is_admin == True,
            )
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an admin to add members",
        )

    # Check if user is already a member
    existing_member = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == member_data.user_id,
            )
        )
        .first()
    )

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group",
        )

    # Check if user exists
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Add member
    db_member = ChatGroupMember(
        group_id=group_id,
        user_id=member_data.user_id,
        is_admin=member_data.is_admin,
    )
    db.add(db_member)
    db.commit()


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from a chat group (admin only or self, user-created groups only)."""
    # Check if group exists and is user-created
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.group_type != "user_created":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members can only be removed from user-created groups through this endpoint",
        )

    # Check if current user is an admin or removing themselves
    membership = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == current_user.id,
            )
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )

    if user_id != current_user.id and not membership.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an admin to remove other members",
        )

    # Find the member to remove
    member_to_remove = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == user_id,
            )
        )
        .first()
    )

    if not member_to_remove:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this group",
        )

    db.delete(member_to_remove)
    db.commit()


# Messages
@router.post("/groups/{group_id}/messages", response_model=ChatMessageSchema, status_code=status.HTTP_201_CREATED)
async def send_message(
    group_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to a chat group."""
    # Check if user is a member
    membership = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == current_user.id,
            )
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )

    # Create message
    db_message = ChatMessage(
        group_id=group_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
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

    return db_message


@router.get("/groups/{group_id}/messages", response_model=List[ChatMessageSchema])
async def get_group_messages(
    group_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get messages from a chat group."""
    # Check if user is a member
    membership = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == current_user.id,
            )
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.group_id == group_id)
        .options(joinedload(ChatMessage.sender))
        .order_by(desc(ChatMessage.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

    return messages[::-1]  # Reverse to show oldest first


# Search functionality
@router.get("/search/groups", response_model=List[ChatGroupSchema])
async def search_public_groups(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for public chat groups (admin/instructor only)."""
    if not is_admin_or_instructor(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can search for groups",
        )
    groups = (
        db.query(ChatGroup)
        .filter(
            and_(
                ChatGroup.is_private == False,
                or_(
                    ChatGroup.name.ilike(f"%{q}%"),
                    ChatGroup.description.ilike(f"%{q}%"),
                ),
            )
        )
        .options(
            joinedload(ChatGroup.created_by),
            joinedload(ChatGroup.managed_by),
            joinedload(ChatGroup.members).joinedload(ChatGroupMember.user),
        )
        .all()
    )

    # Add member count to each group
    for group in groups:
        group.member_count = len(group.members)

    return groups


@router.post("/groups/{group_id}/join", status_code=status.HTTP_201_CREATED)
async def join_public_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a public chat group (admin/instructor only)."""
    if not is_admin_or_instructor(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can join groups directly",
        )
    # Check if group exists and is public
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.is_private:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot join private group without invitation",
        )

    # Check if already a member
    existing_member = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == current_user.id,
            )
        )
        .first()
    )

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this group",
        )

    # Add as member
    db_member = ChatGroupMember(
        group_id=group_id,
        user_id=current_user.id,
        is_admin=False,
    )
    db.add(db_member)
    db.commit()
