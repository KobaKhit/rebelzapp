from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_permissions, get_current_user
from app.db.database import get_db
from app.models import Event, EventRegistration, AttendanceRecord, User
from app.models.registration import RegistrationStatus
from app.schemas.registration import (
    RegistrationCreate,
    RegistrationRead,
    RegistrationUpdate,
    AttendanceCreate,
    AttendanceRead,
    AttendanceUpdate,
    EventRegistrationStats,
    UserRegistrationHistory,
)


router = APIRouter()


def registration_to_read(registration: EventRegistration) -> RegistrationRead:
    return RegistrationRead(
        id=registration.id,
        event_id=registration.event_id,
        user_id=registration.user_id,
        status=registration.status,
        registration_date=registration.registration_date,
        notes=registration.notes,
        emergency_contact=registration.emergency_contact,
        dietary_restrictions=registration.dietary_restrictions,
        special_needs=registration.special_needs,
        user_email=registration.user.email if registration.user else None,
        user_full_name=registration.user.full_name if registration.user else None,
        event_title=registration.event.title if registration.event else None,
    )


def attendance_to_read(attendance: AttendanceRecord) -> AttendanceRead:
    return AttendanceRead(
        id=attendance.id,
        registration_id=attendance.registration_id,
        check_in_time=attendance.check_in_time,
        check_out_time=attendance.check_out_time,
        was_present=attendance.was_present,
        notes=attendance.notes,
        recorded_by_user_id=attendance.recorded_by_user_id,
        user_email=attendance.registration.user.email if attendance.registration and attendance.registration.user else None,
        user_full_name=attendance.registration.user.full_name if attendance.registration and attendance.registration.user else None,
    )


@router.post("/", response_model=RegistrationRead, status_code=status.HTTP_201_CREATED)
def register_for_event(
    payload: RegistrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RegistrationRead:
    """Register current user for an event"""
    # Check if event exists
    event = db.get(Event, payload.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user is already registered
    existing = db.execute(
        select(EventRegistration).where(
            and_(
                EventRegistration.event_id == payload.event_id,
                EventRegistration.user_id == current_user.id
            )
        )
    ).scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this event")
    
    # Check capacity
    if event.capacity:
        confirmed_count = db.execute(
            select(func.count(EventRegistration.id)).where(
                and_(
                    EventRegistration.event_id == payload.event_id,
                    EventRegistration.status == RegistrationStatus.CONFIRMED
                )
            )
        ).scalar()
        
        initial_status = RegistrationStatus.CONFIRMED if confirmed_count < event.capacity else RegistrationStatus.WAITLIST
    else:
        initial_status = RegistrationStatus.CONFIRMED
    
    registration = EventRegistration(
        event_id=payload.event_id,
        user_id=current_user.id,
        status=initial_status,
        notes=payload.notes,
        emergency_contact=payload.emergency_contact,
        dietary_restrictions=payload.dietary_restrictions,
        special_needs=payload.special_needs,
    )
    
    db.add(registration)
    db.commit()
    db.refresh(registration)
    
    # Load relationships for response
    db.refresh(registration, ["user", "event"])
    
    return registration_to_read(registration)


@router.get("/", response_model=List[RegistrationRead], dependencies=[Depends(require_permissions("manage_events"))])
def list_registrations(
    db: Session = Depends(get_db),
    event_id: Optional[int] = Query(None, description="Filter by event ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    status: Optional[str] = Query(None, description="Filter by registration status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> List[RegistrationRead]:
    """List event registrations with optional filters"""
    query = select(EventRegistration).options(joinedload(EventRegistration.user), joinedload(EventRegistration.event))
    
    filters = []
    if event_id:
        filters.append(EventRegistration.event_id == event_id)
    if user_id:
        filters.append(EventRegistration.user_id == user_id)
    if status:
        filters.append(EventRegistration.status == status)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.offset(offset).limit(limit)
    registrations = db.execute(query).scalars().all()
    
    return [registration_to_read(r) for r in registrations]


@router.get("/my", response_model=List[RegistrationRead])
def get_my_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[RegistrationRead]:
    """Get current user's registrations"""
    registrations = db.execute(
        select(EventRegistration)
        .options(joinedload(EventRegistration.event))
        .where(EventRegistration.user_id == current_user.id)
        .order_by(EventRegistration.registration_date.desc())
    ).scalars().all()
    
    return [registration_to_read(r) for r in registrations]


@router.patch("/{registration_id}", response_model=RegistrationRead, dependencies=[Depends(require_permissions("manage_events"))])
def update_registration(
    registration_id: int,
    payload: RegistrationUpdate,
    db: Session = Depends(get_db),
) -> RegistrationRead:
    """Update a registration (admin only)"""
    registration = db.get(EventRegistration, registration_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if payload.status is not None:
        registration.status = payload.status
    if payload.notes is not None:
        registration.notes = payload.notes
    if payload.emergency_contact is not None:
        registration.emergency_contact = payload.emergency_contact
    if payload.dietary_restrictions is not None:
        registration.dietary_restrictions = payload.dietary_restrictions
    if payload.special_needs is not None:
        registration.special_needs = payload.special_needs
    
    db.add(registration)
    db.commit()
    db.refresh(registration, ["user", "event"])
    
    return registration_to_read(registration)


@router.delete("/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_registration(
    registration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a registration"""
    registration = db.get(EventRegistration, registration_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # Users can only cancel their own registrations, unless they have manage_events permission
    has_manage_permission = any(
        "manage_events" in [p.name for p in role.permissions]
        for role in current_user.roles
    ) or "admin" in [role.name for role in current_user.roles]
    
    if registration.user_id != current_user.id and not has_manage_permission:
        raise HTTPException(status_code=403, detail="Can only cancel your own registrations")
    
    db.delete(registration)
    db.commit()


# Attendance endpoints
@router.post("/attendance", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permissions("manage_events"))])
def record_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceRead:
    """Record attendance for a registration"""
    registration = db.get(EventRegistration, payload.registration_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # Check if attendance already recorded
    existing = db.execute(
        select(AttendanceRecord).where(AttendanceRecord.registration_id == payload.registration_id)
    ).scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already recorded")
    
    attendance = AttendanceRecord(
        registration_id=payload.registration_id,
        was_present=payload.was_present,
        check_in_time=payload.check_in_time,
        check_out_time=payload.check_out_time,
        notes=payload.notes,
        recorded_by_user_id=current_user.id,
    )
    
    db.add(attendance)
    db.commit()
    db.refresh(attendance, ["registration"])
    
    return attendance_to_read(attendance)


@router.get("/attendance", response_model=List[AttendanceRead], dependencies=[Depends(require_permissions("manage_events"))])
def list_attendance(
    db: Session = Depends(get_db),
    event_id: Optional[int] = Query(None, description="Filter by event ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> List[AttendanceRead]:
    """List attendance records"""
    query = select(AttendanceRecord).options(joinedload(AttendanceRecord.registration))
    
    if event_id:
        query = query.join(EventRegistration).where(EventRegistration.event_id == event_id)
    
    query = query.offset(offset).limit(limit)
    attendance_records = db.execute(query).scalars().all()
    
    return [attendance_to_read(a) for a in attendance_records]


@router.get("/stats/event/{event_id}", response_model=EventRegistrationStats, dependencies=[Depends(require_permissions("manage_events"))])
def get_event_registration_stats(event_id: int, db: Session = Depends(get_db)) -> EventRegistrationStats:
    """Get registration statistics for an event"""
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get registration counts by status
    registrations = db.execute(
        select(EventRegistration).where(EventRegistration.event_id == event_id)
    ).scalars().all()
    
    total_registrations = len(registrations)
    confirmed_registrations = len([r for r in registrations if r.status == RegistrationStatus.CONFIRMED])
    pending_registrations = len([r for r in registrations if r.status == RegistrationStatus.PENDING])
    waitlist_registrations = len([r for r in registrations if r.status == RegistrationStatus.WAITLIST])
    cancelled_registrations = len([r for r in registrations if r.status == RegistrationStatus.CANCELLED])
    
    # Calculate attendance rate
    attendance_records = db.execute(
        select(AttendanceRecord)
        .join(EventRegistration)
        .where(EventRegistration.event_id == event_id)
    ).scalars().all()
    
    attended_count = len([a for a in attendance_records if a.was_present])
    attendance_rate = (attended_count / confirmed_registrations * 100) if confirmed_registrations > 0 else None
    
    return EventRegistrationStats(
        event_id=event_id,
        event_title=event.title,
        total_capacity=event.capacity,
        total_registrations=total_registrations,
        confirmed_registrations=confirmed_registrations,
        pending_registrations=pending_registrations,
        waitlist_registrations=waitlist_registrations,
        cancelled_registrations=cancelled_registrations,
        attendance_rate=attendance_rate,
    )