from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.associations import role_permissions, user_roles


class Role(Base):
	__tablename__ = "roles"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
	description: Mapped[str | None] = mapped_column(String(255), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
	updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	permissions = relationship(
		"Permission",
		secondary=role_permissions,
		back_populates="roles",
		overlaps="permissions,roles",
	)

	users = relationship(
		"User",
		secondary=user_roles,
		back_populates="roles",
		overlaps="roles,users",
	)