from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional, Type

from pydantic import BaseModel, Field


class BaseEventData(BaseModel):
	title: str
	description: Optional[str] = None
	location: Optional[str] = None
	start_time: datetime
	end_time: datetime


class ClassEventData(BaseEventData):
	subject: str
	grade_level: Optional[str] = None
	capacity: Optional[int] = Field(default=None, ge=0)


class SportClassEventData(BaseEventData):
	sport: str
	skill_level: Optional[str] = None
	coach: Optional[str] = None


class GenericEventData(BaseEventData):
	pass


class ClinicEventData(BaseEventData):
	topic: str
	coach: Optional[str] = None


class EventRegistry:
	def __init__(self) -> None:
		self._registry: Dict[str, Type[BaseEventData]] = {}

	def register(self, type_name: str, schema: Type[BaseEventData]) -> None:
		self._registry[type_name] = schema

	def get_schema(self, type_name: str) -> Optional[Type[BaseEventData]]:
		return self._registry.get(type_name)

	def list_types(self) -> Dict[str, str]:
		return {name: schema.__name__ for name, schema in self._registry.items()}

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


event_registry = EventRegistry()

# Built-in types
event_registry.register("class", ClassEventData)
event_registry.register("sport_class", SportClassEventData)
event_registry.register("event", GenericEventData)
event_registry.register("clinic", ClinicEventData)