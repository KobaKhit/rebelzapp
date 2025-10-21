from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from starlette.staticfiles import StaticFiles
import os

from app.core.config import get_settings
from app.db.database import Base, engine
from app.middleware.security import (
    RateLimitMiddleware, 
    SecurityHeadersMiddleware, 
    RequestLoggingMiddleware
)
from app.middleware.redis_rate_limit import RedisRateLimitMiddleware

from app.api.routers import auth as auth_router
from app.api.routers import users as users_router
from app.api.routers import roles as roles_router
from app.api.routers import permissions as permissions_router
from app.api.routers import events as events_router
from app.api.routers import registrations as registrations_router
from app.api.routers import ai as ai_router
from app.api.routers import copilotkit as copilotkit_router
from app.api.routers import chat as chat_router
from app.api.routers import admin_chat as admin_chat_router
from app.api.routers import websocket as websocket_router


settings = get_settings()

# Disable docs in production for security
docs_url = "/docs" if settings.enable_docs else None
redoc_url = "/redoc" if settings.enable_docs else None

app = FastAPI(
    title=settings.app_name, 
    version="0.1.0", 
    default_response_class=ORJSONResponse,
    docs_url=docs_url,
    redoc_url=redoc_url
)

# CORS configuration for development
cors_origins = settings.allowed_origins if settings.allowed_origins else ["*"]
# Always allow common development origins
dev_origins = [
	"http://localhost:3000",
	"http://localhost:5173", 
	"http://127.0.0.1:3000",
	"http://127.0.0.1:5173"
]
if settings.env == "development":
	cors_origins.extend(dev_origins)
	cors_origins = list(set(cors_origins))  # Remove duplicates

# Security middleware (order matters - add in reverse order of execution)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Rate limiting - use Redis in production, fallback to memory
if settings.is_production and settings.redis_url:
    app.add_middleware(RedisRateLimitMiddleware, calls=settings.rate_limit_calls, period=settings.rate_limit_period)
else:
    app.add_middleware(RateLimitMiddleware, calls=settings.rate_limit_calls, period=settings.rate_limit_period)

app.add_middleware(
	CORSMiddleware,
	allow_origins=cors_origins,
	allow_credentials=True,
	allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allow_headers=["*"],
)


app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(users_router.router, prefix="/users", tags=["users"])
app.include_router(roles_router.router, prefix="/roles", tags=["roles"])
app.include_router(permissions_router.router, prefix="/permissions", tags=["permissions"]) 
app.include_router(events_router.router, prefix="/events", tags=["events"]) 
app.include_router(registrations_router.router, prefix="/registrations", tags=["registrations"])
app.include_router(ai_router.router, prefix="/ai", tags=["ai"])
app.include_router(copilotkit_router.router, prefix="/api/copilotkit", tags=["copilotkit"])
app.include_router(chat_router.router, prefix="/chat", tags=["chat"])
app.include_router(admin_chat_router.router, prefix="/chat", tags=["admin-chat"])
app.include_router(websocket_router.router, prefix="/ws", tags=["websocket"]) 

# Static UI removed - using React frontend instead

# Serve uploaded files
uploads_dir = "uploads"
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Optionally serve built Vite frontend if present
try:
	frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
	frontend_dist = os.path.abspath(frontend_dist)
	if os.path.isdir(frontend_dist):
		app.mount("/app", StaticFiles(directory=frontend_dist, html=True), name="app")
except Exception:
	# Non-fatal if not present in development
	pass


@app.get("/health")
async def health() -> dict:
	return {"status": "ok"}


@app.on_event("startup")
async def on_startup() -> None:
	# Create tables on startup (for dev). In prod, prefer Alembic migrations.
	Base.metadata.create_all(bind=engine)