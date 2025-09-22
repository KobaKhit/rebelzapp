from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional, Type, List, Any
from enum import Enum

from pydantic import BaseModel, Field


class SkillLevel(str, Enum):
	BEGINNER = "beginner"
	INTERMEDIATE = "intermediate"
	ADVANCED = "advanced"
	EXPERT = "expert"


class GradeLevel(str, Enum):
	PRE_K = "pre_k"
	KINDERGARTEN = "kindergarten"
	GRADE_1 = "grade_1"
	GRADE_2 = "grade_2"
	GRADE_3 = "grade_3"
	GRADE_4 = "grade_4"
	GRADE_5 = "grade_5"
	GRADE_6 = "grade_6"
	GRADE_7 = "grade_7"
	GRADE_8 = "grade_8"
	GRADE_9 = "grade_9"
	GRADE_10 = "grade_10"
	GRADE_11 = "grade_11"
	GRADE_12 = "grade_12"
	ADULT = "adult"


class EventCategory(str, Enum):
	EDUCATION = "education"
	SPORTS = "sports"
	ARTS = "arts"
	TECHNOLOGY = "technology"
	HEALTH = "health"
	COMMUNITY = "community"
	PROFESSIONAL = "professional"


class BaseEventData(BaseModel):
	"""Base schema for all event types"""
	pass


class ClassEventData(BaseEventData):
	"""Academic class event"""
	subject: str = Field(..., description="Subject being taught")
	grade_level: Optional[GradeLevel] = Field(None, description="Target grade level")
	instructor: Optional[str] = Field(None, description="Instructor name")
	materials_needed: Optional[List[str]] = Field(default_factory=list, description="Required materials")
	prerequisites: Optional[List[str]] = Field(default_factory=list, description="Prerequisites")
	max_students: Optional[int] = Field(None, ge=1, description="Maximum number of students")


class SportClassEventData(BaseEventData):
	"""Sports/fitness class event"""
	sport: str = Field(..., description="Sport or activity type")
	skill_level: Optional[SkillLevel] = Field(None, description="Required skill level")
	coach: Optional[str] = Field(None, description="Coach or instructor name")
	equipment_provided: Optional[List[str]] = Field(default_factory=list, description="Equipment provided")
	equipment_needed: Optional[List[str]] = Field(default_factory=list, description="Equipment participants need")
	age_group: Optional[str] = Field(None, description="Target age group")


class WorkshopEventData(BaseEventData):
	"""Workshop or training event"""
	topic: str = Field(..., description="Workshop topic")
	facilitator: Optional[str] = Field(None, description="Workshop facilitator")
	learning_objectives: Optional[List[str]] = Field(default_factory=list, description="Learning objectives")
	materials_included: Optional[List[str]] = Field(default_factory=list, description="Materials included")
	certification: Optional[str] = Field(None, description="Certification offered")


class SeminarEventData(BaseEventData):
	"""Seminar or lecture event"""
	speaker: str = Field(..., description="Main speaker")
	topic: str = Field(..., description="Seminar topic")
	speaker_bio: Optional[str] = Field(None, description="Speaker biography")
	target_audience: Optional[str] = Field(None, description="Target audience")
	recording_available: bool = Field(False, description="Will recording be available")


class CampEventData(BaseEventData):
	"""Multi-day camp event"""
	camp_type: str = Field(..., description="Type of camp")
	age_range: str = Field(..., description="Age range for participants")
	daily_schedule: Optional[str] = Field(None, description="Typical daily schedule")
	what_to_bring: Optional[List[str]] = Field(default_factory=list, description="What participants should bring")
	pickup_dropoff_info: Optional[str] = Field(None, description="Pickup and dropoff information")
	extended_care: bool = Field(False, description="Extended care available")


class CompetitionEventData(BaseEventData):
	"""Competition or tournament event"""
	competition_type: str = Field(..., description="Type of competition")
	categories: Optional[List[str]] = Field(default_factory=list, description="Competition categories")
	rules: Optional[str] = Field(None, description="Competition rules")
	prizes: Optional[List[str]] = Field(default_factory=list, description="Prizes available")
	registration_deadline: Optional[datetime] = Field(None, description="Registration deadline")
	entry_fee: Optional[float] = Field(None, ge=0, description="Entry fee")


class CommunityEventData(BaseEventData):
	"""Community gathering event"""
	event_theme: Optional[str] = Field(None, description="Event theme")
	activities: Optional[List[str]] = Field(default_factory=list, description="Planned activities")
	food_provided: bool = Field(False, description="Food will be provided")
	volunteer_opportunities: Optional[List[str]] = Field(default_factory=list, description="Volunteer opportunities")
	family_friendly: bool = Field(True, description="Family-friendly event")


class ConferenceEventData(BaseEventData):
	"""Conference or symposium event"""
	conference_theme: str = Field(..., description="Conference theme")
	keynote_speakers: Optional[List[str]] = Field(default_factory=list, description="Keynote speakers")
	tracks: Optional[List[str]] = Field(default_factory=list, description="Conference tracks")
	networking_events: Optional[List[str]] = Field(default_factory=list, description="Networking events")
	materials_provided: Optional[List[str]] = Field(default_factory=list, description="Materials provided")
	continuing_education: Optional[str] = Field(None, description="Continuing education credits")


class GenericEventData(BaseEventData):
	"""Generic event for custom use cases"""
	category: Optional[EventCategory] = Field(None, description="Event category")
	custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom fields")


class EventTypeInfo(BaseModel):
	"""Information about an event type"""
	name: str
	display_name: str
	description: str
	schema_class: str
	category: EventCategory
	icon: Optional[str] = None
	color: Optional[str] = None


class EventRegistry:
	def __init__(self) -> None:
		self._registry: Dict[str, Type[BaseEventData]] = {}
		self._type_info: Dict[str, EventTypeInfo] = {}

	def register(
		self,
		type_name: str,
		schema: Type[BaseEventData],
		display_name: str,
		description: str,
		category: EventCategory,
		icon: Optional[str] = None,
		color: Optional[str] = None,
	) -> None:
		"""Register a new event type with metadata"""
		self._registry[type_name] = schema
		self._type_info[type_name] = EventTypeInfo(
			name=type_name,
			display_name=display_name,
			description=description,
			schema_class=schema.__name__,
			category=category,
			icon=icon,
			color=color,
		)

	def get_schema(self, type_name: str) -> Optional[Type[BaseEventData]]:
		"""Get the schema class for a given event type"""
		return self._registry.get(type_name)

	def get_type_info(self, type_name: str) -> Optional[EventTypeInfo]:
		"""Get metadata for a given event type"""
		return self._type_info.get(type_name)

	def list_types(self) -> Dict[str, str]:
		"""List all registered event types with their display names"""
		return {name: info.display_name for name, info in self._type_info.items()}

	def list_types_detailed(self) -> Dict[str, EventTypeInfo]:
		"""List all registered event types with full metadata"""
		return self._type_info.copy()

	def get_types_by_category(self, category: EventCategory) -> Dict[str, EventTypeInfo]:
		"""Get all event types in a specific category"""
		return {
			name: info
			for name, info in self._type_info.items()
			if info.category == category
		}

	def validate_event_data(self, type_name: str, data: Dict[str, Any]) -> bool:
		"""Validate event data against the schema"""
		schema = self.get_schema(type_name)
		if schema is None:
			return False
		try:
			schema.model_validate(data)
			return True
		except Exception:
			return False

	def list_type_schemas(self) -> Dict[str, dict]:
		"""Return JSON Schemas for all registered event types keyed by type name.

		The schemas follow Pydantic v2 model_json_schema() output for use in dynamic forms.
		"""
		result: Dict[str, dict] = {}
		for name, schema in self._registry.items():
			try:
				result[name] = schema.model_json_schema()
			except Exception:
				# Fallback to minimal structure if schema generation fails
				result[name] = {"title": schema.__name__, "type": "object"}
		return result


# Create the global registry
event_registry = EventRegistry()

# Register built-in event types
event_registry.register(
	"class",
	ClassEventData,
	"Academic Class",
	"Traditional academic classes and courses",
	EventCategory.EDUCATION,
	icon="academic-cap",
	color="blue",
)

event_registry.register(
	"sport_class",
	SportClassEventData,
	"Sports Class",
	"Sports and fitness classes",
	EventCategory.SPORTS,
	icon="trophy",
	color="green",
)

event_registry.register(
	"workshop",
	WorkshopEventData,
	"Workshop",
	"Hands-on learning workshops and training sessions",
	EventCategory.EDUCATION,
	icon="wrench-screwdriver",
	color="purple",
)

event_registry.register(
	"seminar",
	SeminarEventData,
	"Seminar",
	"Educational seminars and lectures",
	EventCategory.EDUCATION,
	icon="presentation-chart-line",
	color="indigo",
)

event_registry.register(
	"camp",
	CampEventData,
	"Camp",
	"Multi-day camps and intensive programs",
	EventCategory.EDUCATION,
	icon="fire",
	color="orange",
)

event_registry.register(
	"competition",
	CompetitionEventData,
	"Competition",
	"Competitions, tournaments, and contests",
	EventCategory.SPORTS,
	icon="trophy",
	color="yellow",
)

event_registry.register(
	"community",
	CommunityEventData,
	"Community Event",
	"Community gatherings and social events",
	EventCategory.COMMUNITY,
	icon="users",
	color="pink",
)

event_registry.register(
	"conference",
	ConferenceEventData,
	"Conference",
	"Professional conferences and symposiums",
	EventCategory.PROFESSIONAL,
	icon="building-office",
	color="gray",
)

event_registry.register(
	"event",
	GenericEventData,
	"General Event",
	"Generic event for custom use cases",
	EventCategory.COMMUNITY,
	icon="calendar",
	color="gray",
)