from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
import asyncio

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.schemas.auth import ChatRequest, ChatResponse
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


# Server-Sent Events endpoint for AG-UI
@router.get("/events")
async def ag_ui_events(
	token: str = None,
	db: Session = Depends(get_db)
):
	"""Server-Sent Events stream for AG-UI communication"""
	# Validate token if provided
	current_user = None
	if token:
		try:
			from app.services.security import decode_access_token
			from app.models import User
			payload = decode_access_token(token)
			user_id = payload.get("sub")
			if user_id:
				current_user = db.get(User, int(user_id))
		except Exception as e:
			print(f"Token validation error in SSE: {e}")
			# Continue without user context for now
	
	async def event_stream():
		try:
			# Send initial connection event
			connection_data = {'type': 'connection', 'data': {'status': 'connected'}}
			if current_user:
				connection_data['data']['user'] = current_user.email
			yield f"data: {json.dumps(connection_data)}\n\n"
			
			# Keep connection alive with heartbeat
			while True:
				await asyncio.sleep(30)  # Send heartbeat every 30 seconds
				heartbeat_data = {
					'type': 'heartbeat', 
					'data': {
						'timestamp': 'now',
						'authenticated': current_user is not None
					}
				}
				yield f"data: {json.dumps(heartbeat_data)}\n\n"
		except Exception as e:
			print(f"Event stream error: {e}")
			yield f"data: {json.dumps({'type': 'error', 'data': {'message': 'Stream error'}})}\n\n"
	
	return StreamingResponse(
		event_stream(),
		media_type="text/event-stream",
		headers={
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control, Authorization"
		}
	)


# AG-UI message endpoint
@router.post("/message")
async def ag_ui_message(
	request: Request,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
	"""Handle AG-UI message requests"""
	try:
		body = await request.json()
		message_data = body.get('data', {})
		user_content = message_data.get('content', '')
		
		if not user_content:
			return {"type": "error", "data": {"message": "No content provided"}}
		
		# Use the RebelzAgent to process the message
		agent = RebelzAgent()
		response = await agent.run(user_content, user=current_user, db=db)
		
		# Handle structured responses (like events)
		if isinstance(response, dict) and response.get("type") == "events":
			return {
				"type": "events",
				"data": response
			}
		elif isinstance(response, dict) and response.get("type") == "text":
			return {
				"type": "message",
				"data": {
					"role": "assistant",
					"content": response.get("content", "")
				}
			}
		else:
			# Fallback for string responses
			return {
				"type": "message",
				"data": {
					"role": "assistant",
					"content": str(response)
				}
			}
	except Exception as e:
		print(f"AG-UI Message Error: {str(e)}")  # Simple error logging
		return {
			"type": "error", 
			"data": {"message": f"Error processing message: {str(e)}"}
		}


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