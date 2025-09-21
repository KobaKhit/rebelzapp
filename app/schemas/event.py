from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class EventBase(BaseModel):
	type: str
	title: str
	description: Optional[str] = None
	location: Optional[str] = None
	start_time: datetime
	end_time: datetime
	capacity: Optional[int] = Field(default=None, ge=0)
	data: Optional[dict] = None
	is_published: bool = False

	class Config:
		from_attributes = True


class EventCreate(EventBase):
	pass


class EventUpdate(BaseModel):
	title: Optional[str] = None
	description: Optional[str] = None
	location: Optional[str] = None
	start_time: Optional[datetime] = None
	end_time: Optional[datetime] = None
	capacity: Optional[int] = Field(default=None, ge=0)
	data: Optional[dict] = None
	is_published: Optional[bool] = None


class EventRead(EventBase):
	id: int
	created_by_user_id: Optional[int] = None