from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from sqlalchemy import select, and_
from sqlalchemy.orm import Session
from pydantic_ai import Agent

from app.core.config import get_settings
from app.models import User, Event, EventRegistration, Role
from app.services.event_registry import event_registry


try:
	from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency at runtime
	OpenAI = None  # type: ignore


settings = get_settings()


class RebelzAgent:
	"""AG-UI compatible Pydantic AI Agent for Rebelz"""
	
	def __init__(self):
		self.agent = Agent(
			model='openai:gpt-4o-mini',
			system_prompt=self._get_base_system_prompt(),
		)
	
	def _get_base_system_prompt(self) -> str:
		return """You are an AI assistant for Rebelz, an educational organization management platform focusing on basketball and educational programs. 
You help users manage events, registrations, users, and organizational tasks.

Key capabilities:
- Event management (sports classes, academic classes, workshops, camps, competitions, etc.)
- User and role management with permissions
- Event registration and attendance tracking
- Personalized recommendations based on user history
- Organizational insights and reporting

You should be helpful, professional, and knowledgeable about educational organization management.
When users ask about their events, registrations, or recommendations, use their specific data to provide personalized responses.
You can suggest events based on their registration history and preferences.
When users ask about specific features, provide clear guidance on how to use the system."""

	def to_ag_ui(self):
		"""Convert to AG-UI compatible ASGI app"""
		return self.agent.to_ag_ui()

	async def run(self, user_input: str, user: Optional[User] = None, db: Optional[Session] = None) -> Dict[str, Any]:
		"""Run the agent with context and return structured response"""
		# Check if this is a request for upcoming events
		if self._is_events_request(user_input) and user and db:
			return self._get_events_response(user, db)
		
		# Build enhanced prompt with context
		context_prompt = self._get_base_system_prompt()
		
		if db:
			context_prompt += "\n" + self._get_system_context(db)
		
		if user and db:
			context_prompt += "\n\nCurrent User Context:\n" + self._get_user_context(user, db)
		
		# Update agent's system prompt with context
		self.agent = Agent(
			model='openai:gpt-4o-mini',
			system_prompt=context_prompt,
		)
		
		result = await self.agent.run(user_input)
		return {
			"type": "text",
			"content": result.output
		}

	def _is_events_request(self, user_input: str) -> bool:
		"""Check if the user is asking about events"""
		keywords = ['upcoming events', 'my events', 'events', 'schedule', 'calendar', 'what do i have']
		return any(keyword in user_input.lower() for keyword in keywords)

	def _get_events_response(self, user: User, db: Session) -> Dict[str, Any]:
		"""Get structured events response for AG-UI"""
		# Get user's upcoming events
		upcoming_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.start_time >= datetime.utcnow()
				)
			)
			.order_by(Event.start_time)
			.limit(10)
		).scalars().all()
		
		events_data = []
		for reg in upcoming_registrations:
			events_data.append({
				"id": reg.event.id,
				"title": reg.event.title,
				"type": reg.event.type,
				"start_time": reg.event.start_time.isoformat(),
				"end_time": reg.event.end_time.isoformat() if reg.event.end_time else None,
				"location": reg.event.location,
				"capacity": reg.event.capacity,
				"status": reg.status,
				"description": reg.event.description
			})
		
		return {
			"type": "events",
			"events": events_data,
			"title": f"Your Upcoming Events ({len(events_data)})",
			"message": f"Here are your {len(events_data)} upcoming events:" if events_data else "You don't have any upcoming events registered."
		}

	def _get_user_context(self, user: User, db: Session) -> str:
		"""Generate comprehensive context about the user for the LLM"""
		context_parts = [
			f"User: {user.full_name or user.email}",
			f"Email: {user.email}",
			f"Roles: {', '.join([role.name for role in user.roles])}",
		]
		
		# Get user's upcoming events
		upcoming_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.start_time >= datetime.utcnow()
				)
			)
			.order_by(Event.start_time)
			.limit(10)
		).scalars().all()
		
		if upcoming_registrations:
			context_parts.append(f"\nUpcoming Events ({len(upcoming_registrations)}):")
			for reg in upcoming_registrations:
				event_date = reg.event.start_time.strftime("%Y-%m-%d %H:%M")
				location_info = f" at {reg.event.location}" if reg.event.location else ""
				context_parts.append(f"  - {reg.event.title} ({reg.event.type}) - {event_date}{location_info} - Status: {reg.status}")
		
		# Get user's recent past events
		past_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.end_time < datetime.utcnow(),
					Event.start_time >= datetime.utcnow() - timedelta(days=60)  # Last 60 days
				)
			)
			.order_by(Event.start_time.desc())
			.limit(5)
		).scalars().all()
		
		if past_registrations:
			context_parts.append(f"\nRecent Completed Events ({len(past_registrations)}):")
			for reg in past_registrations:
				event_date = reg.event.start_time.strftime("%Y-%m-%d")
				context_parts.append(f"  - {reg.event.title} ({reg.event.type}) - {event_date}")
		
		# Get registration statistics
		total_registrations = db.execute(
			select(EventRegistration).where(EventRegistration.user_id == user.id)
		).scalars().all()
		
		confirmed_count = len([r for r in total_registrations if r.status == "confirmed"])
		pending_count = len([r for r in total_registrations if r.status == "pending"])
		waitlist_count = len([r for r in total_registrations if r.status == "waitlist"])
		
		context_parts.append(f"\nRegistration Summary:")
		context_parts.append(f"  - Total registrations: {len(total_registrations)}")
		context_parts.append(f"  - Confirmed: {confirmed_count}, Pending: {pending_count}, Waitlisted: {waitlist_count}")
		
		# Get user's preferred event types (based on registration history)
		event_types = {}
		for reg in total_registrations:
			event_type = reg.event.type
			event_types[event_type] = event_types.get(event_type, 0) + 1
		
		if event_types:
			sorted_types = sorted(event_types.items(), key=lambda x: x[1], reverse=True)
			context_parts.append(f"  - Most registered event types: {', '.join([f'{t}({c})' for t, c in sorted_types[:3]])}")
		
		return "\n".join(context_parts)

	def _get_system_context(self, db: Session) -> str:
		"""Generate enhanced system context for the LLM"""
		# Get event types
		event_types = event_registry.list_types_detailed()
		
		# Get upcoming events
		upcoming_events = db.execute(
			select(Event).where(
				and_(
					Event.start_time >= datetime.utcnow(),
					Event.is_published == True
				)
			)
			.order_by(Event.start_time)
		).scalars().all()
		
		context_parts = [
			"Rebelz System Information:",
			f"- Total upcoming published events: {len(upcoming_events)}",
			f"- Available event types: {', '.join(event_types.keys())}",
			"- System supports user management, role-based access control, event registration, and attendance tracking",
		]
		
		# Add information about upcoming events by type
		if upcoming_events:
			events_by_type = {}
			for event in upcoming_events[:20]:  # Limit to next 20 events
				event_type = event.type
				if event_type not in events_by_type:
					events_by_type[event_type] = []
				events_by_type[event_type].append(event)
			
			context_parts.append("\nUpcoming Events Available:")
			for event_type, events in events_by_type.items():
				context_parts.append(f"- {event_type.replace('_', ' ').title()} ({len(events)} events):")
				for event in events[:3]:  # Show max 3 events per type
					event_date = event.start_time.strftime("%Y-%m-%d")
					location_info = f" at {event.location}" if event.location else ""
					capacity_info = f" (capacity: {event.capacity})" if event.capacity else ""
					context_parts.append(f"  • {event.title} - {event_date}{location_info}{capacity_info}")
				if len(events) > 3:
					context_parts.append(f"  • ... and {len(events) - 3} more {event_type} events")
		
		# Add event type descriptions for better context
		context_parts.append("\nEvent Type Descriptions:")
		for type_name, type_info in event_types.items():
			context_parts.append(f"- {type_info.display_name}: {type_info.description}")
		
		return "\n".join(context_parts)


class ContextAwareLLMClient:
	def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
		self.api_key = api_key or settings.openai_api_key
		self.model_name = model_name or settings.model_name
		self._client = OpenAI(api_key=self.api_key) if (OpenAI and self.api_key) else None

	def get_user_context(self, user: User, db: Session) -> str:
		"""Generate comprehensive context about the user for the LLM"""
		context_parts = [
			f"User: {user.full_name or user.email}",
			f"Email: {user.email}",
			f"Roles: {', '.join([role.name for role in user.roles])}",
		]
		
		# Get user's upcoming events
		upcoming_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.start_time >= datetime.utcnow()
				)
			)
			.order_by(Event.start_time)
			.limit(10)
		).scalars().all()
		
		if upcoming_registrations:
			context_parts.append(f"\nUpcoming Events ({len(upcoming_registrations)}):")
			for reg in upcoming_registrations:
				event_date = reg.event.start_time.strftime("%Y-%m-%d %H:%M")
				location_info = f" at {reg.event.location}" if reg.event.location else ""
				context_parts.append(f"  - {reg.event.title} ({reg.event.type}) - {event_date}{location_info} - Status: {reg.status}")
		
		# Get user's recent past events
		past_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.end_time < datetime.utcnow(),
					Event.start_time >= datetime.utcnow() - timedelta(days=60)  # Last 60 days
				)
			)
			.order_by(Event.start_time.desc())
			.limit(5)
		).scalars().all()
		
		if past_registrations:
			context_parts.append(f"\nRecent Completed Events ({len(past_registrations)}):")
			for reg in past_registrations:
				event_date = reg.event.start_time.strftime("%Y-%m-%d")
				context_parts.append(f"  - {reg.event.title} ({reg.event.type}) - {event_date}")
		
		# Get registration statistics
		total_registrations = db.execute(
			select(EventRegistration).where(EventRegistration.user_id == user.id)
		).scalars().all()
		
		confirmed_count = len([r for r in total_registrations if r.status == "confirmed"])
		pending_count = len([r for r in total_registrations if r.status == "pending"])
		waitlist_count = len([r for r in total_registrations if r.status == "waitlist"])
		
		context_parts.append(f"\nRegistration Summary:")
		context_parts.append(f"  - Total registrations: {len(total_registrations)}")
		context_parts.append(f"  - Confirmed: {confirmed_count}, Pending: {pending_count}, Waitlisted: {waitlist_count}")
		
		# Get user's preferred event types (based on registration history)
		event_types = {}
		for reg in total_registrations:
			event_type = reg.event.type
			event_types[event_type] = event_types.get(event_type, 0) + 1
		
		if event_types:
			sorted_types = sorted(event_types.items(), key=lambda x: x[1], reverse=True)
			context_parts.append(f"  - Most registered event types: {', '.join([f'{t}({c})' for t, c in sorted_types[:3]])}")
		
		return "\n".join(context_parts)

	def get_system_context(self, db: Session) -> str:
		"""Generate enhanced system context for the LLM"""
		# Get event types
		event_types = event_registry.list_types_detailed()
		
		# Get upcoming events
		upcoming_events = db.execute(
			select(Event).where(
				and_(
					Event.start_time >= datetime.utcnow(),
					Event.is_published == True
				)
			)
			.order_by(Event.start_time)
		).scalars().all()
		
		context_parts = [
			"Rebelz System Information:",
			f"- Total upcoming published events: {len(upcoming_events)}",
			f"- Available event types: {', '.join(event_types.keys())}",
			"- System supports user management, role-based access control, event registration, and attendance tracking",
		]
		
		# Add information about upcoming events by type
		if upcoming_events:
			events_by_type = {}
			for event in upcoming_events[:20]:  # Limit to next 20 events
				event_type = event.type
				if event_type not in events_by_type:
					events_by_type[event_type] = []
				events_by_type[event_type].append(event)
			
			context_parts.append("\nUpcoming Events Available:")
			for event_type, events in events_by_type.items():
				context_parts.append(f"- {event_type.replace('_', ' ').title()} ({len(events)} events):")
				for event in events[:3]:  # Show max 3 events per type
					event_date = event.start_time.strftime("%Y-%m-%d")
					location_info = f" at {event.location}" if event.location else ""
					capacity_info = f" (capacity: {event.capacity})" if event.capacity else ""
					context_parts.append(f"  • {event.title} - {event_date}{location_info}{capacity_info}")
				if len(events) > 3:
					context_parts.append(f"  • ... and {len(events) - 3} more {event_type} events")
		
		# Add event type descriptions for better context
		context_parts.append("\nEvent Type Descriptions:")
		for type_name, type_info in event_types.items():
			context_parts.append(f"- {type_info.display_name}: {type_info.description}")
		
		return "\n".join(context_parts)

	def create_system_prompt(self, user: Optional[User] = None, db: Optional[Session] = None) -> str:
		"""Create a comprehensive system prompt with context"""
		base_prompt = """You are an AI assistant for Rebelz, an educational organization management platform focusing on basketball and educational programs. 
You help users manage events, registrations, users, and organizational tasks.

Key capabilities:
- Event management (sports classes, academic classes, workshops, camps, competitions, etc.)
- User and role management with permissions
- Event registration and attendance tracking
- Personalized recommendations based on user history
- Organizational insights and reporting

You should be helpful, professional, and knowledgeable about educational organization management.
When users ask about their events, registrations, or recommendations, use their specific data to provide personalized responses.
You can suggest events based on their registration history and preferences.
When users ask about specific features, provide clear guidance on how to use the system.
"""
		
		if db:
			base_prompt += "\n" + self.get_system_context(db)
		
		if user and db:
			base_prompt += "\n\nCurrent User Context:\n" + self.get_user_context(user, db)
		
		return base_prompt

	def chat(self, messages: List[Dict[str, str]], user: Optional[User] = None, db: Optional[Session] = None) -> Dict[str, Any]:
		"""Enhanced chat with context awareness"""
		# Add system context if available
		enhanced_messages = messages.copy()
		if user or db:
			system_prompt = self.create_system_prompt(user, db)
			enhanced_messages.insert(0, {"role": "system", "content": system_prompt})
		
		if self._client is None:
			# Enhanced fallback stub with context awareness
			assistant_text = self._context_aware_stub(enhanced_messages, user, db)
			return {"model": self.model_name, "choices": [{"message": {"role": "assistant", "content": assistant_text}}]}

		try:
			resp = self._client.chat.completions.create(
				model=self.model_name, 
				messages=enhanced_messages,
				temperature=0.7,
				max_tokens=1000,
			)
			# Normalize to a plain dict
			return resp.model_dump() if hasattr(resp, "model_dump") else resp  # type: ignore
		except Exception as e:
			# Fallback to stub if API fails
			assistant_text = f"I'm having trouble connecting to the AI service right now. Error: {str(e)}"
			return {"model": self.model_name, "choices": [{"message": {"role": "assistant", "content": assistant_text}}]}

	def _context_aware_stub(self, messages: List[Dict[str, str]], user: Optional[User] = None, db: Optional[Session] = None) -> str:
		"""Enhanced stub response with context awareness including user event data"""
		last_user = next((m for m in reversed(messages) if m.get("role") == "user"), None)
		content = last_user.get("content", "") if last_user else ""
		
		# Basic keyword-based responses
		content_lower = content.lower()
		user_name = user.full_name or user.email if user else "there"
		
		if any(keyword in content_lower for keyword in ["my events", "my registrations", "upcoming"]):
			if user and db:
				# Get user's upcoming events for personalized response
				upcoming_count = db.execute(
					select(EventRegistration)
					.join(Event)
					.where(
						and_(
							EventRegistration.user_id == user.id,
							Event.start_time >= datetime.utcnow()
						)
					)
				).scalars().all()
				
				if upcoming_count:
					return f"Hello {user_name}! You have {len(upcoming_count)} upcoming events registered. I can help you manage your registrations, check event details, or suggest similar events you might be interested in based on your history. What would you like to know?"
				else:
					return f"Hello {user_name}! You don't have any upcoming events registered yet. I can help you discover events that match your interests or guide you through the registration process. What type of activities are you interested in?"
			else:
				return "I can help you check your upcoming events and registrations. You can view your event schedule, check registration status, and get reminders about upcoming activities."
		
		elif any(keyword in content_lower for keyword in ["recommend", "suggest", "what should"]):
			return f"Hello {user_name}! I can provide personalized event recommendations based on your registration history and preferences. I can suggest basketball training sessions, educational workshops, camps, or community events that match your interests. What type of activities are you looking for?"
		
		elif any(keyword in content_lower for keyword in ["event", "class", "workshop"]):
			return "I can help you with event management! You can create different types of events like sports classes, academic classes, workshops, camps, and competitions. Each event type has specific fields for better organization. Would you like to know more about creating or managing events?"
		
		elif any(keyword in content_lower for keyword in ["register", "registration", "sign up"]):
			return "For event registration, users can sign up for events through the system. The platform handles capacity limits, waitlists, and registration status. Administrators can track attendance and manage registrations. What specific aspect of registration would you like to explore?"
		
		elif any(keyword in content_lower for keyword in ["user", "role", "permission"]):
			return "The system uses role-based access control with different user roles like admin, instructor, and student. Each role has specific permissions for managing different aspects of the platform. How can I help you with user or role management?"
		
		elif any(keyword in content_lower for keyword in ["help", "how to", "guide"]):
			return f"Hello {user_name}! I'm here to help you navigate Rebelz Basketball & Education platform. You can ask me about your events, registration status, event recommendations, creating events, managing users, or any other features. What would you like to learn about?"
		
		else:
			return f"I understand you're asking about: {content}. While I'm running in demo mode, I can still help you with personalized event recommendations, checking your registrations, and navigating Rebelz's features like event management and registration tracking. What specific area would you like assistance with?"

	def suggest_actions(self, user: User, db: Session) -> List[str]:
		"""Suggest relevant actions based on user context and event data"""
		suggestions = []
		
		# Check user roles for relevant suggestions
		user_roles = [role.name for role in user.roles]
		
		# Get user's event data for personalized suggestions
		upcoming_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.start_time >= datetime.utcnow()
				)
			)
			.order_by(Event.start_time)
		).scalars().all()
		
		# Get user's event preferences based on history
		all_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(EventRegistration.user_id == user.id)
		).scalars().all()
		
		event_type_counts = {}
		for reg in all_registrations:
			event_type = reg.event.type
			event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1
		
		# Personalized suggestions based on user's event activity
		if upcoming_registrations:
			# User has upcoming events
			next_event = upcoming_registrations[0]
			days_until = (next_event.event.start_time - datetime.utcnow()).days
			
			if days_until <= 7:
				suggestions.append(f"Your next event '{next_event.event.title}' is in {days_until} days - check event details")
			
			if len(upcoming_registrations) > 1:
				suggestions.append(f"You have {len(upcoming_registrations)} upcoming events - review your schedule")
		else:
			# User has no upcoming events - suggest based on preferences
			if event_type_counts:
				favorite_type = max(event_type_counts, key=event_type_counts.get)
				suggestions.append(f"Discover new {favorite_type.replace('_', ' ')} events based on your interests")
			else:
				suggestions.append("Explore available events - basketball classes, workshops, and camps")
		
		# Get available events that match user's preferences
		available_events = db.execute(
			select(Event)
			.where(
				and_(
					Event.start_time >= datetime.utcnow(),
					Event.is_published == True
				)
			)
			.order_by(Event.start_time)
			.limit(10)
		).scalars().all()
		
		# Suggest events based on user's preferred types
		if event_type_counts and available_events:
			user_favorite_types = sorted(event_type_counts.items(), key=lambda x: x[1], reverse=True)[:2]
			for event in available_events:
				for fav_type, _ in user_favorite_types:
					if event.type == fav_type:
						# Check if user is not already registered
						is_registered = any(reg.event_id == event.id for reg in upcoming_registrations)
						if not is_registered:
							suggestions.append(f"Register for '{event.title}' - matches your interest in {fav_type.replace('_', ' ')}")
							break
				if len(suggestions) >= 4:  # Don't overwhelm with too many suggestions
					break
		
		# Role-based suggestions
		if "admin" in user_roles:
			suggestions.extend([
				"Review user management and role assignments",
				"Check upcoming event registrations and capacity",
				"Generate attendance reports for recent events",
			])
		
		if "instructor" in user_roles:
			suggestions.extend([
				"Create a new class or workshop",
				"Review registrations for your upcoming events",
				"Record attendance for recent events",
			])
		
		# General suggestions if no specific ones
		if not suggestions:
			suggestions.extend([
				"Explore available basketball training programs",
				"Check out educational workshops and STEM programs",
				"View community events and social activities",
				"Update your profile preferences",
			])
		
		return suggestions[:5]  # Limit to top 5 suggestions


# Legacy compatibility
LLMClient = ContextAwareLLMClient