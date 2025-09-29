from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
	email: EmailStr
	full_name: Optional[str] = None
	profile_picture: Optional[str] = None
	is_active: bool = True

	class Config:
		from_attributes = True


class UserCreate(BaseModel):
	email: EmailStr
	full_name: Optional[str] = None
	password: str = Field(min_length=8)


class UserUpdate(BaseModel):
	full_name: Optional[str] = None
	password: Optional[str] = Field(default=None, min_length=8)
	profile_picture: Optional[str] = None
	is_active: Optional[bool] = None


class UserRead(UserBase):
	id: int
	roles: list[str] = []