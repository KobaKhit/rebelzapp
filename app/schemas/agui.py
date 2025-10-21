"""AG-UI Protocol Schemas using Pydantic"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


class AGUIMessage(BaseModel):
    """AG-UI message format"""
    role: Literal["user", "assistant", "system"]
    content: str


class AGUIEvent(BaseModel):
    """AG-UI event format"""
    type: str
    data: Dict[str, Any] = Field(default_factory=dict)


class AGUIConnectionData(BaseModel):
    """Connection event data"""
    status: str
    authenticated: bool = False
    user: Optional[str] = None


class AGUIHeartbeatData(BaseModel):
    """Heartbeat event data"""
    timestamp: str
    authenticated: bool = False


class AGUIMessageRequest(BaseModel):
    """Request to send a message via AG-UI"""
    type: Literal["message"]
    data: AGUIMessage


class AGUIMessageResponse(BaseModel):
    """Response from AG-UI message endpoint"""
    type: Literal["message", "events", "error", "thinking"]
    data: Dict[str, Any]


class AGUIEventsData(BaseModel):
    """Structured events data for AG-UI"""
    events: List[Dict[str, Any]]
    title: str
    message: str


class AGUITextData(BaseModel):
    """Text response data"""
    role: Literal["assistant"]
    content: str


class AGUIErrorData(BaseModel):
    """Error response data"""
    message: str
    code: Optional[str] = None

