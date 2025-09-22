from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Event(Base):
	__tablename__ = "events"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
	title: Mapped[str] = mapped_column(String(255), nullable=False)
	description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
	location: Mapped[str | None] = mapped_column(String(255), nullable=True)
	start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
	capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
	is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
	created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
	updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	creator = relationship("User", foreign_keys=[created_by_user_id])
	registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")