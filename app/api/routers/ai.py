from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, Request, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
import asyncio

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.schemas.auth import ChatRequest, ChatResponse
from app.schemas.agui import (
    AGUIMessageRequest, 
    AGUIMessageResponse, 
    AGUIEvent,
    AGUIConnectionData,
    AGUIHeartbeatData,
    AGUIEventsData,
    AGUITextData,
    AGUIErrorData
)
from app.services.llm import ContextAwareLLMClient, RebelzAgent


router = APIRouter()

# Create the AG-UI compatible agent
rebelz_agent = RebelzAgent()

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


# Server-Sent Events endpoint for AG-UI with Pydantic models
@router.get("/events")
async def ag_ui_events(
	token: Optional[str] = None,
	authorization: Optional[str] = Header(None),
	db: Session = Depends(get_db)
):
	"""Server-Sent Events stream for AG-UI communication with Pydantic validation"""
	# Validate token if provided (either from query param or header)
	current_user = None
	auth_token = token or (authorization.replace("Bearer ", "") if authorization else None)
	
	if auth_token:
		try:
			from app.services.security import decode_access_token
			payload = decode_access_token(auth_token)
			user_id = payload.get("sub")
			if user_id:
				current_user = db.get(User, int(user_id))
		except Exception as e:
			print(f"Token validation error in SSE: {e}")
			# Continue without user context
	
	async def event_stream():
		try:
			# Send initial connection event using Pydantic model
			connection_data = AGUIEvent(
				type="connection",
				data=AGUIConnectionData(
					status="connected",
					authenticated=current_user is not None,
					user=current_user.email if current_user else None
				).model_dump()
			)
			yield f"data: {connection_data.model_dump_json()}\n\n"
			
			# Keep connection alive with heartbeat
			while True:
				await asyncio.sleep(30)  # Send heartbeat every 30 seconds
				heartbeat_data = AGUIEvent(
					type="heartbeat",
					data=AGUIHeartbeatData(
						timestamp="now",
						authenticated=current_user is not None
					).model_dump()
				)
				yield f"data: {heartbeat_data.model_dump_json()}\n\n"
		except asyncio.CancelledError:
			print(f"SSE connection closed for user: {current_user.email if current_user else 'anonymous'}")
		except Exception as e:
			print(f"Event stream error: {e}")
			import traceback
			traceback.print_exc()
			error_event = AGUIEvent(
				type="error",
				data=AGUIErrorData(message="Stream error").model_dump()
			)
			yield f"data: {error_event.model_dump_json()}\n\n"
	
	return StreamingResponse(
		event_stream(),
		media_type="text/event-stream",
		headers={
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control, Authorization",
			"X-Accel-Buffering": "no"
		}
	)


# AG-UI message endpoint with Pydantic validation
@router.post("/message", response_model=AGUIMessageResponse)
async def ag_ui_message(
	message_request: AGUIMessageRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
) -> AGUIMessageResponse:
	"""Handle AG-UI message requests with Pydantic validation"""
	try:
		user_content = message_request.data.content
		
		if not user_content:
			return AGUIMessageResponse(
				type="error",
				data=AGUIErrorData(message="No content provided").model_dump()
			)
		
		# Use the RebelzAgent to process the message
		agent = RebelzAgent()
		response = await agent.run(user_content, user=current_user, db=db)
		
		# Handle structured responses (like events)
		if isinstance(response, dict) and response.get("type") == "events":
			return AGUIMessageResponse(
				type="events",
				data=response
			)
		elif isinstance(response, dict) and response.get("type") == "text":
			return AGUIMessageResponse(
				type="message",
				data=AGUITextData(
					role="assistant",
					content=response.get("content", "")
				).model_dump()
			)
		else:
			# Fallback for string responses
			return AGUIMessageResponse(
				type="message",
				data=AGUITextData(
					role="assistant",
					content=str(response)
				).model_dump()
			)
	except Exception as e:
		print(f"AG-UI Message Error: {str(e)}")
		import traceback
		traceback.print_exc()
		return AGUIMessageResponse(
			type="error",
			data=AGUIErrorData(
				message=f"Error processing message: {str(e)}"
			).model_dump()
		)


# AG-UI endpoint - mount the agent as a sub-application
@router.api_route("/ag-ui/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def ag_ui_proxy(request: Request):
	"""Proxy requests to AG-UI compatible agent"""
	# For now, we'll create a simple AG-UI compatible response
	# In production, you'd mount the actual AG-UI app here
	ag_ui_app = rebelz_agent.to_ag_ui()
	return await ag_ui_app(request.scope, request.receive, request._send)


@router.get("/ag-ui-info")
async def ag_ui_info():
	"""Get AG-UI endpoint information"""
	return {
		"ag_ui_endpoint": "/ai/ag-ui",
		"protocol_version": "0.0.38",
		"agent_name": "Rebelz Assistant",
		"capabilities": [
			"event_management",
			"user_registration", 
			"personalized_recommendations",
			"context_awareness"
		]
	}