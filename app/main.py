from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
from app.db.database import Base, engine


settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0", default_response_class=ORJSONResponse)

app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.allowed_origins or ["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


# Routers will be added after they are created
# from app.api.routers import auth, users, roles, permissions, events, ai
# app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(users.router, prefix="/users", tags=["users"])
# app.include_router(roles.router, prefix="/roles", tags=["roles"])
# app.include_router(permissions.router, prefix="/permissions", tags=["permissions"]) 
# app.include_router(events.router, prefix="/events", tags=["events"]) 
# app.include_router(ai.router, prefix="/ai", tags=["ai"]) 


@app.get("/health")
async def health() -> dict:
	return {"status": "ok"}


@app.on_event("startup")
async def on_startup() -> None:
	# Create tables on startup (for dev). In prod, prefer Alembic migrations.
	Base.metadata.create_all(bind=engine)