from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.schemas.auth import ChatRequest, ChatResponse
from app.services.llm import ContextAwareLLMClient


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
	req: ChatRequest, 
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
) -> ChatResponse:
	"""Enhanced AI chat with user and system context"""
	client = ContextAwareLLMClient()
	resp = client.chat(
		[m.model_dump() for m in req.messages], 
		user=current_user, 
		db=db
	)
	return ChatResponse.model_validate(resp)


@router.get("/suggestions")
async def get_suggestions(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
) -> List[str]:
	"""Get personalized suggestions for the current user"""
	client = ContextAwareLLMClient()
	return client.suggest_actions(current_user, db)


@router.get("/help/topics")
async def get_help_topics() -> List[dict]:
	"""Get available help topics"""
	return [
		{
			"title": "Event Management",
			"description": "Learn how to create, edit, and manage different types of events",
			"keywords": ["events", "classes", "workshops", "camps"]
		},
		{
			"title": "User Registration", 
			"description": "Understand how event registration and waitlists work",
			"keywords": ["registration", "signup", "waitlist", "capacity"]
		},
		{
			"title": "User Management",
			"description": "Manage users, roles, and permissions in your organization", 
			"keywords": ["users", "roles", "permissions", "admin"]
		},
		{
			"title": "Attendance Tracking",
			"description": "Record and track attendance for your events",
			"keywords": ["attendance", "check-in", "present", "absent"]
		},
		{
			"title": "Reports & Analytics",
			"description": "Generate reports and view analytics for your organization",
			"keywords": ["reports", "analytics", "statistics", "data"]
		}
	]