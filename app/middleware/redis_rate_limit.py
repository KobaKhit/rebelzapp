from __future__ import annotations

import time
from typing import Optional
import json

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings


settings = get_settings()


class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-based rate limiting middleware for production use.
    Falls back to in-memory if Redis is not available.
    """
    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.redis = None
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection if available."""
        try:
            if settings.redis_url:
                import redis
                self.redis = redis.from_url(settings.redis_url, decode_responses=True)
                # Test connection
                self.redis.ping()
                print("✅ Redis connected for rate limiting")
        except Exception as e:
            print(f"⚠️  Redis not available, using in-memory rate limiting: {e}")
            self.redis = None
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        
        if self.redis:
            # Use Redis for rate limiting
            if await self._is_rate_limited_redis(client_ip):
                return self._rate_limit_response()
        else:
            # Fallback to in-memory (not recommended for production)
            if hasattr(self, '_memory_store'):
                if self._is_rate_limited_memory(client_ip):
                    return self._rate_limit_response()
            else:
                self._memory_store = {}
        
        response = await call_next(request)
        return response
    
    async def _is_rate_limited_redis(self, client_ip: str) -> bool:
        """Check rate limit using Redis."""
        try:
            key = f"rate_limit:{client_ip}"
            current_time = int(time.time())
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, current_time - self.period)
            
            # Count current requests
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, self.period)
            
            results = pipe.execute()
            current_count = results[1]  # Count after cleanup
            
            return current_count >= self.calls
            
        except Exception as e:
            print(f"Redis error in rate limiting: {e}")
            return False  # Allow request if Redis fails
    
    def _is_rate_limited_memory(self, client_ip: str) -> bool:
        """Fallback in-memory rate limiting."""
        current_time = time.time()
        
        if client_ip not in self._memory_store:
            self._memory_store[client_ip] = []
        
        requests = self._memory_store[client_ip]
        
        # Clean old requests
        requests[:] = [req_time for req_time in requests if req_time > current_time - self.period]
        
        if len(requests) >= self.calls:
            return True
        
        requests.append(current_time)
        return False
    
    def _rate_limit_response(self):
        """Return rate limit exceeded response."""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": f"Rate limit exceeded. Max {self.calls} requests per {self.period} seconds.",
                "retry_after": self.period
            },
            headers={"Retry-After": str(self.period)}
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, handling proxies."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        return request.client.host if request.client else "unknown"
