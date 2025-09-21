from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class RoleBase(BaseModel):
	name: str
	description: Optional[str] = None

	class Config:
		from_attributes = True


class RoleCreate(RoleBase):
	pass


class RoleUpdate(BaseModel):
	description: Optional[str] = None


class RoleRead(RoleBase):
	id: int
	permissions: list[str] = []