from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
	access_token: str
	token_type: str = "bearer"


class TokenPayload(BaseModel):
	sub: str
	exp: int


class LoginRequest(BaseModel):
	email: str
	password: str


class Message(BaseModel):
	role: str
	content: str


class ChatRequest(BaseModel):
	messages: list[Message]


class Choice(BaseModel):
	message: Message
	finish_reason: Optional[str] = None
	index: int = 0


class ChatResponse(BaseModel):
	model: str
	choices: list[Choice]