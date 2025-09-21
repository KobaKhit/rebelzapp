from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.core.config import get_settings


try:
	from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency at runtime
	OpenAI = None  # type: ignore


settings = get_settings()


class LLMClient:
	def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
		self.api_key = api_key or settings.openai_api_key
		self.model_name = model_name or settings.model_name
		self._client = OpenAI(api_key=self.api_key) if (OpenAI and self.api_key) else None

	def chat(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
		if self._client is None:
			# Fallback stub
			assistant_text = self._local_stub(messages)
			return {"model": self.model_name, "choices": [{"message": {"role": "assistant", "content": assistant_text}}]}

		resp = self._client.chat.completions.create(model=self.model_name, messages=messages)
		# Normalize to a plain dict
		return resp.model_dump() if hasattr(resp, "model_dump") else resp  # type: ignore

	def _local_stub(self, messages: List[Dict[str, str]]) -> str:
		last_user = next((m for m in reversed(messages) if m.get("role") == "user"), None)
		content = last_user.get("content") if last_user else ""
		return f"[stubbed-ai] You said: {content}"