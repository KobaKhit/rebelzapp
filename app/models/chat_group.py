from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.chat_message import ChatMessage


class ChatGroup(Base):
    __tablename__ = "chat_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    group_type: Mapped[str] = mapped_column(String(50), default="user_created", nullable=False)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    managed_by_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)  # Admin/Instructor who manages this group
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    managed_by = relationship("User", foreign_keys=[managed_by_id])
    members = relationship("ChatGroupMember", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="group", cascade="all, delete-orphan")


class ChatGroupMember(Base):
    __tablename__ = "chat_group_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("chat_groups.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    group = relationship("ChatGroup", back_populates="members")
    user = relationship("User")
