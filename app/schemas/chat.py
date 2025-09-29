from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, Field


class GroupType(str, Enum):
    USER_CREATED = "user_created"
    ADMIN_MANAGED = "admin_managed"
    INSTRUCTOR_MANAGED = "instructor_managed"


# Chat Group Schemas
class ChatGroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    is_private: bool = Field(False, description="Whether the group is private")
    group_type: GroupType = Field(GroupType.USER_CREATED, description="Type of group management")


class ChatGroupCreate(ChatGroupBase):
    pass


class ChatGroupCreateAdmin(BaseModel):
    """Schema for admin/instructor creating managed groups"""
    name: str = Field(..., min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    is_private: bool = Field(True, description="Whether the group is private")
    group_type: GroupType = Field(..., description="Type of group management")
    member_ids: List[int] = Field(default_factory=list, description="Initial member user IDs")


class ChatGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_private: Optional[bool] = None


class ChatGroupMemberBase(BaseModel):
    user_id: int
    is_admin: bool = False


class ChatGroupMemberCreate(ChatGroupMemberBase):
    pass


class ChatGroupMemberUpdate(BaseModel):
    is_admin: Optional[bool] = None


class ChatGroupMember(ChatGroupMemberBase):
    id: int
    group_id: int
    joined_at: datetime
    user: Optional["UserBasic"] = None

    class Config:
        from_attributes = True


class ChatGroup(ChatGroupBase):
    id: int
    created_by_id: int
    managed_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional["UserBasic"] = None
    managed_by: Optional["UserBasic"] = None
    members: List[ChatGroupMember] = []
    member_count: Optional[int] = None

    class Config:
        from_attributes = True


# Chat Message Schemas
class ChatMessageBase(BaseModel):
    content: str = Field(..., min_length=1, description="Message content")
    message_type: str = Field("text", description="Message type (text, image, file, etc.)")


class ChatMessageCreate(ChatMessageBase):
    group_id: int


class ChatMessage(ChatMessageBase):
    id: int
    group_id: int
    sender_id: int
    created_at: datetime
    updated_at: datetime
    sender: Optional["UserBasic"] = None

    class Config:
        from_attributes = True


# User Basic Schema for relationships
class UserBasic(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


# WebSocket Message Schemas
class WebSocketMessage(BaseModel):
    type: str  # "message", "user_joined", "user_left", "typing", etc.
    data: dict


class ChatMessageWebSocket(BaseModel):
    type: str = "message"
    message: ChatMessage


class UserJoinedWebSocket(BaseModel):
    type: str = "user_joined"
    user: UserBasic
    group_id: int


class UserLeftWebSocket(BaseModel):
    type: str = "user_left"
    user: UserBasic
    group_id: int


class TypingWebSocket(BaseModel):
    type: str = "typing"
    user: UserBasic
    group_id: int
    is_typing: bool


# Update forward references
ChatGroupMember.model_rebuild()
ChatGroup.model_rebuild()
ChatMessage.model_rebuild()
