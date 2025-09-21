from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class PermissionBase(BaseModel):
	name: str
	description: Optional[str] = None

	class Config:
		from_attributes = True


class PermissionCreate(PermissionBase):
	pass


class PermissionUpdate(BaseModel):
	description: Optional[str] = None


class PermissionRead(PermissionBase):
	id: int