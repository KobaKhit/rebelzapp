from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RegistrationCreate(BaseModel):
    event_id: int
    notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    special_needs: Optional[str] = None


class RegistrationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    special_needs: Optional[str] = None


class RegistrationRead(BaseModel):
    id: int
    event_id: int
    user_id: int
    status: str
    registration_date: datetime
    notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    special_needs: Optional[str] = None
    
    # Optional nested data
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    event_title: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    registration_id: int
    was_present: bool = True
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    was_present: Optional[bool] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    notes: Optional[str] = None


class AttendanceRead(BaseModel):
    id: int
    registration_id: int
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    was_present: bool
    notes: Optional[str] = None
    recorded_by_user_id: Optional[int] = None
    
    # Optional nested data
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None

    class Config:
        from_attributes = True


class EventRegistrationStats(BaseModel):
    event_id: int
    event_title: str
    total_capacity: Optional[int] = None
    total_registrations: int
    confirmed_registrations: int
    pending_registrations: int
    waitlist_registrations: int
    cancelled_registrations: int
    attendance_rate: Optional[float] = None  # Percentage of confirmed who attended


class UserRegistrationHistory(BaseModel):
    user_id: int
    user_email: str
    user_full_name: Optional[str] = None
    total_registrations: int
    confirmed_registrations: int
    attended_events: int
    attendance_rate: Optional[float] = None