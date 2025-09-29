"""Admin and instructor chat group management endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import ChatGroup, ChatGroupMember, User
from app.schemas.chat import (
    ChatGroup as ChatGroupSchema,
    ChatGroupCreateAdmin,
    ChatGroupUpdate,
    GroupType as SchemaGroupType,
)
from app.utils.permissions import can_create_managed_groups, can_manage_groups, is_admin

router = APIRouter()


@router.post("/admin/groups", response_model=ChatGroupSchema, status_code=status.HTTP_201_CREATED)
async def create_managed_group(
    group_data: ChatGroupCreateAdmin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new admin or instructor managed chat group."""
    if not can_create_managed_groups(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can create managed groups",
        )

    # Validate group type permissions
    if group_data.group_type == SchemaGroupType.ADMIN_MANAGED and not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create admin-managed groups",
        )

    # Create the group
    db_group = ChatGroup(
        name=group_data.name,
        description=group_data.description,
        is_private=group_data.is_private,
        group_type=group_data.group_type.value,
        created_by_id=current_user.id,
        managed_by_id=current_user.id,
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

    # Add initial members if specified
    for user_id in group_data.member_ids:
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        # Skip if it's the creator (already added)
        if user_id == current_user.id:
            continue

        # Add member
        db_member = ChatGroupMember(
            group_id=db_group.id,
            user_id=user_id,
            is_admin=False,
        )
        db.add(db_member)

    db.commit()
    db.refresh(db_group)

    # Load relationships
    db_group = (
        db.query(ChatGroup)
        .filter(ChatGroup.id == db_group.id)
        .options(
            joinedload(ChatGroup.created_by),
            joinedload(ChatGroup.managed_by),
            joinedload(ChatGroup.members).joinedload(ChatGroupMember.user),
        )
        .first()
    )

    return db_group


@router.get("/admin/groups", response_model=List[ChatGroupSchema])
async def get_managed_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all groups managed by the current admin/instructor."""
    if not can_manage_groups(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can view managed groups",
        )

    # Get groups managed by current user
    groups = (
        db.query(ChatGroup)
        .filter(ChatGroup.managed_by_id == current_user.id)
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


@router.get("/admin/groups/all", response_model=List[ChatGroupSchema])
async def get_all_managed_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all managed groups (admin only)."""
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view all managed groups",
        )

    # Get all managed groups
    groups = (
        db.query(ChatGroup)
        .filter(ChatGroup.group_type.in_(["admin_managed", "instructor_managed"]))
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


@router.put("/admin/groups/{group_id}", response_model=ChatGroupSchema)
async def update_managed_group(
    group_id: int,
    group_data: ChatGroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a managed group."""
    if not can_manage_groups(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can update managed groups",
        )

    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    # Check if user can manage this group
    if not is_admin(current_user) and group.managed_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update groups you manage",
        )

    # Update fields
    update_data = group_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)

    db.commit()
    db.refresh(group)

    # Load relationships
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

    return group


@router.post("/admin/groups/{group_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
async def assign_user_to_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a user to a managed group."""
    if not can_manage_groups(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can assign users to groups",
        )

    # Check if group exists and is managed
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.group_type == "user_created":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign users to user-created groups",
        )

    # Check if user can manage this group
    if not is_admin(current_user) and group.managed_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only assign users to groups you manage",
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check if user is already a member
    existing_member = (
        db.query(ChatGroupMember)
        .filter(
            and_(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.user_id == user_id,
            )
        )
        .first()
    )

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group",
        )

    # Add member
    db_member = ChatGroupMember(
        group_id=group_id,
        user_id=user_id,
        is_admin=False,
    )
    db.add(db_member)
    db.commit()


@router.delete("/admin/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a user from a managed group."""
    if not can_manage_groups(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can remove users from groups",
        )

    # Check if group exists and is managed
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.group_type == "user_created":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove users from user-created groups",
        )

    # Check if user can manage this group
    if not is_admin(current_user) and group.managed_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove users from groups you manage",
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

    # Don't allow removing the group manager
    if user_id == group.managed_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the group manager",
        )

    db.delete(member_to_remove)
    db.commit()


@router.delete("/admin/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_managed_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a managed group."""
    if not can_manage_groups(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can delete managed groups",
        )

    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.group_type == "user_created":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete user-created groups through admin interface",
        )

    # Check if user can manage this group
    if not is_admin(current_user) and group.managed_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete groups you manage",
        )

    db.delete(group)
    db.commit()
