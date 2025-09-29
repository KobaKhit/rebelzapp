from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field


load_dotenv()


class Settings(BaseModel):
	model_config = {"protected_namespaces": (), "frozen": True}
	
	app_name: str = Field(default=os.getenv("APP_NAME", "Rebelz API"))
	env: str = Field(default=os.getenv("ENV", "development"))
	debug: bool = Field(default=os.getenv("DEBUG", "true").lower() == "true")
	secret_key: str = Field(default=os.getenv("SECRET_KEY", "change_me"))
	access_token_expire_minutes: int = Field(default=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")))
	database_url: str = Field(default=os.getenv("DATABASE_URL", "sqlite:///./app.db"))
	allowed_origins: List[str] = Field(default_factory=lambda: [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()])
	openai_api_key: Optional[str] = Field(default=os.getenv("OPENAI_API_KEY"))
	model_name: str = Field(default=os.getenv("MODEL_NAME", "gpt-4o-mini"))
	
	# Security settings
	max_file_size: int = Field(default=int(os.getenv("MAX_FILE_SIZE", "5242880")))  # 5MB default
	rate_limit_calls: int = Field(default=int(os.getenv("RATE_LIMIT_CALLS", "100")))
	rate_limit_period: int = Field(default=int(os.getenv("RATE_LIMIT_PERIOD", "60")))
	enable_docs: bool = Field(default=os.getenv("ENABLE_DOCS", "true" if os.getenv("ENV", "development") == "development" else "false").lower() == "true")
	
	# Redis settings for production rate limiting
	redis_url: Optional[str] = Field(default=os.getenv("REDIS_URL"))
	
	@property
	def is_production(self) -> bool:
		return self.env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
	return Settings()