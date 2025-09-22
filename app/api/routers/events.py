from __future__ import annotations

from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permissions, get_current_user
from app.db.database import get_db
from app.models import Event, User
from app.schemas.event import EventCreate, EventRead, EventUpdate
from app.services.event_registry import event_registry


router = APIRouter()


@router.get("/types", response_model=Dict[str, str])
def list_event_types() -> Dict[str, str]:
	return event_registry.list_types()


@router.get("/types/detailed")
def list_event_types_detailed():
	return event_registry.list_types_detailed()


@router.get("/types/categories")
def list_event_categories():
	from app.services.event_registry import EventCategory
	return {category.value: category.value.replace('_', ' ').title() for category in EventCategory}


@router.get("/types/category/{category}")
def get_event_types_by_category(category: str):
	from app.services.event_registry import EventCategory
	try:
		cat_enum = EventCategory(category)
		return event_registry.get_types_by_category(cat_enum)
	except ValueError:
		raise HTTPException(status_code=400, detail=f"Invalid category: {category}")


@router.get("/type_schemas", response_model=Dict[str, Any])
def list_event_type_schemas() -> Dict[str, Any]:
	# For backward compatibility with the original implementation
	return event_registry.list_type_schemas() if hasattr(event_registry, 'list_type_schemas') else {}


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permissions("manage_events"))])
def create_event(payload: EventCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> EventRead:
	schema = event_registry.get_schema(payload.type)
	if schema is None:
		raise HTTPException(status_code=400, detail=f"Unknown event type: {payload.type}")
	# validate data if provided
	if payload.data is not None:
		schema.model_validate(payload.data)
	event = Event(
		type=payload.type,
		title=payload.title,
		description=payload.description,
		location=payload.location,
		start_time=payload.start_time,
		end_time=payload.end_time,
		capacity=payload.capacity,
		data=payload.data,
		is_published=payload.is_published,
		created_by_user_id=current_user.id,
	)
	db.add(event)
	db.commit()
	db.refresh(event)
	return EventRead.model_validate(event)


@router.get("/", response_model=List[EventRead], dependencies=[Depends(require_permissions("view_events"))])
def list_events(db: Session = Depends(get_db), type: Optional[str] = Query(default=None)) -> List[EventRead]:
	query = select(Event)
	if type:
		query = query.where(Event.type == type)
	events = db.execute(query).scalars().all()
	return [EventRead.model_validate(e) for e in events]


@router.get("/{event_id}", response_model=EventRead, dependencies=[Depends(require_permissions("view_events"))])
def get_event(event_id: int, db: Session = Depends(get_db)) -> EventRead:
	event = db.get(Event, event_id)
	if not event:
		raise HTTPException(status_code=404, detail="Event not found")
	return EventRead.model_validate(event)


@router.patch("/{event_id}", response_model=EventRead, dependencies=[Depends(require_permissions("manage_events"))])
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)) -> EventRead:
	event = db.get(Event, event_id)
	if not event:
		raise HTTPException(status_code=404, detail="Event not found")
	if payload.title is not None:
		event.title = payload.title
	if payload.description is not None:
		event.description = payload.description
	if payload.location is not None:
		event.location = payload.location
	if payload.start_time is not None:
		event.start_time = payload.start_time
	if payload.end_time is not None:
		event.end_time = payload.end_time
	if payload.capacity is not None:
		event.capacity = payload.capacity
	if payload.data is not None:
		schema = event_registry.get_schema(event.type)
		if schema is None:
			raise HTTPException(status_code=400, detail=f"Unknown event type: {event.type}")
		schema.model_validate(payload.data)
		event.data = payload.data
	if payload.is_published is not None:
		event.is_published = payload.is_published
	db.add(event)
	db.commit()
	db.refresh(event)
	return EventRead.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions("manage_events"))])
def delete_event(event_id: int, db: Session = Depends(get_db)):
	event = db.get(Event, event_id)
	if not event:
		raise HTTPException(status_code=404, detail="Event not found")
	db.delete(event)
	db.commit()