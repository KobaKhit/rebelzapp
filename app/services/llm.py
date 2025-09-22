from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import User, Event, EventRegistration, Role
from app.services.event_registry import event_registry


try:
	from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency at runtime
	OpenAI = None  # type: ignore


settings = get_settings()


class ContextAwareLLMClient:
	def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
		self.api_key = api_key or settings.openai_api_key
		self.model_name = model_name or settings.model_name
		self._client = OpenAI(api_key=self.api_key) if (OpenAI and self.api_key) else None

	def get_user_context(self, user: User, db: Session) -> str:
		"""Generate context about the user for the LLM"""
		context_parts = [
			f"User: {user.full_name or user.email}",
			f"Email: {user.email}",
			f"Roles: {', '.join([role.name for role in user.roles])}",
		]
		
		# Get user's recent registrations
		recent_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.start_time >= datetime.utcnow() - timedelta(days=30)
				)
			)
			.limit(5)
		).scalars().all()
		
		if recent_registrations:
			context_parts.append("Recent event registrations:")
			for reg in recent_registrations:
				context_parts.append(f"  - {reg.event.title} ({reg.status})")
		
		return "\n".join(context_parts)

	def get_system_context(self, db: Session) -> str:
		"""Generate system context for the LLM"""
		# Get event types
		event_types = event_registry.list_types_detailed()
		
		# Get upcoming events count
		upcoming_events = db.execute(
			select(Event).where(
				and_(
					Event.start_time >= datetime.utcnow(),
					Event.is_published == True
				)
			)
		).scalars().all()
		
		context_parts = [
			"EduOrg System Information:",
			f"- Total upcoming published events: {len(upcoming_events)}",
			f"- Available event types: {', '.join(event_types.keys())}",
			"- System supports user management, role-based access control, event registration, and attendance tracking",
		]
		
		return "\n".join(context_parts)

	def create_system_prompt(self, user: Optional[User] = None, db: Optional[Session] = None) -> str:
		"""Create a comprehensive system prompt with context"""
		base_prompt = """You are an AI assistant for EduOrg, an educational organization management platform. 
You help users manage events, registrations, users, and organizational tasks.

Key capabilities:
- Event management (classes, workshops, camps, competitions, etc.)
- User and role management with permissions
- Event registration and attendance tracking
- Organizational insights and reporting

You should be helpful, professional, and knowledgeable about educational organization management.
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
			assistant_text = self._context_aware_stub(enhanced_messages, user)
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

	def _context_aware_stub(self, messages: List[Dict[str, str]], user: Optional[User] = None) -> str:
		"""Enhanced stub response with basic context awareness"""
		last_user = next((m for m in reversed(messages) if m.get("role") == "user"), None)
		content = last_user.get("content", "") if last_user else ""
		
		# Basic keyword-based responses
		content_lower = content.lower()
		
		if any(keyword in content_lower for keyword in ["event", "class", "workshop"]):
			return "I can help you with event management! You can create different types of events like classes, workshops, camps, and competitions. Each event type has specific fields for better organization. Would you like to know more about creating or managing events?"
		
		elif any(keyword in content_lower for keyword in ["register", "registration", "sign up"]):
			return "For event registration, users can sign up for events through the system. The platform handles capacity limits, waitlists, and registration status. Administrators can track attendance and manage registrations. What specific aspect of registration would you like to explore?"
		
		elif any(keyword in content_lower for keyword in ["user", "role", "permission"]):
			return "The system uses role-based access control with different user roles like admin, instructor, and student. Each role has specific permissions for managing different aspects of the platform. How can I help you with user or role management?"
		
		elif any(keyword in content_lower for keyword in ["help", "how to", "guide"]):
			user_name = user.full_name or user.email if user else "there"
			return f"Hello {user_name}! I'm here to help you navigate EduOrg. You can ask me about creating events, managing users, handling registrations, or any other features. What would you like to learn about?"
		
		else:
			return f"I understand you're asking about: {content}. While I'm running in demo mode, I can still help you navigate EduOrg's features like event management, user administration, and registration tracking. What specific area would you like assistance with?"

	def suggest_actions(self, user: User, db: Session) -> List[str]:
		"""Suggest relevant actions based on user context"""
		suggestions = []
		
		# Check user roles for relevant suggestions
		user_roles = [role.name for role in user.roles]
		
		if "admin" in user_roles:
			suggestions.extend([
				"Review user management and role assignments",
				"Check upcoming event registrations and capacity",
				"Generate attendance reports for recent events",
				"Create new event types or update existing ones",
			])
		
		if "instructor" in user_roles:
			suggestions.extend([
				"Create a new class or workshop",
				"Review registrations for your upcoming events",
				"Record attendance for recent events",
				"Update event details or materials needed",
			])
		
		# Check for upcoming events user is registered for
		upcoming_registrations = db.execute(
			select(EventRegistration)
			.join(Event)
			.where(
				and_(
					EventRegistration.user_id == user.id,
					Event.start_time >= datetime.utcnow(),
					Event.start_time <= datetime.utcnow() + timedelta(days=7)
				)
			)
		).scalars().all()
		
		if upcoming_registrations:
			suggestions.append(f"You have {len(upcoming_registrations)} upcoming events this week")
		
		return suggestions[:5]  # Limit to top 5 suggestions


# Legacy compatibility
LLMClient = ContextAwareLLMClient