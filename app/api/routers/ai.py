from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.auth import ChatRequest, ChatResponse
from app.services.llm import LLMClient


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
	client = LLMClient()
	resp = client.chat([m.model_dump() for m in req.messages])
	return ChatResponse.model_validate(resp)