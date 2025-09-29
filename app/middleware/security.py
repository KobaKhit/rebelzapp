from __future__ import annotations

import time
from typing import Dict, Optional
from collections import defaultdict, deque

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import get_settings


settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent API abuse.
    Uses in-memory storage for simplicity - for production scale, use Redis.
    """
    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls  # Max calls per period
        self.period = period  # Time period in seconds
        self.clients: Dict[str, deque] = defaultdict(deque)
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)
            
        # Get client IP
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Clean old requests
        client_requests = self.clients[client_ip]
        while client_requests and client_requests[0] <= current_time - self.period:
            client_requests.popleft()
        
        # Check rate limit
        if len(client_requests) >= self.calls:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Max {self.calls} requests per {self.period} seconds.",
                    "retry_after": self.period
                },
                headers={"Retry-After": str(self.period)}
            )
        
        # Add current request
        client_requests.append(current_time)
        
        response = await call_next(request)
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, handling proxies."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        return request.client.host if request.client else "unknown"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Only add HSTS in production with HTTPS
        if settings.env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' wss: ws:; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log suspicious requests for security monitoring."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log potentially suspicious requests
        self._log_suspicious_request(request)
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        # Log slow requests (potential DoS attempts)
        if process_time > 5.0:  # 5 seconds
            print(f"SLOW REQUEST: {request.method} {request.url.path} - {process_time:.2f}s from {self._get_client_ip(request)}")
        
        return response
    
    def _log_suspicious_request(self, request: Request):
        """Log potentially suspicious requests."""
        suspicious_patterns = [
            "admin", "phpmyadmin", "wp-admin", "wp-login",
            ".env", "config", "backup", "dump",
            "shell", "cmd", "exec", "eval",
            "../", "..\\", "%2e%2e",
            "<script", "javascript:", "vbscript:",
        ]
        
        path = request.url.path.lower()
        query = str(request.url.query).lower() if request.url.query else ""
        
        for pattern in suspicious_patterns:
            if pattern in path or pattern in query:
                client_ip = self._get_client_ip(request)
                print(f"SUSPICIOUS REQUEST: {request.method} {request.url} from {client_ip}")
                break
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, handling proxies."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        return request.client.host if request.client else "unknown"
