# Unified Dockerfile for Full-Stack Rebelz App
# Builds both frontend and backend in a single container

# Stage 1: Build Frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Main Application
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies including nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY create_admin.py ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Create nginx configuration for serving frontend + API
RUN echo 'server { \
    listen 80; \
    server_name _; \
    \
    # Serve frontend static files \
    location / { \
        root /app/frontend/dist; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Proxy API requests to FastAPI backend \
    location /api/ { \
        proxy_pass http://127.0.0.1:8000/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    # Proxy WebSocket connections \
    location /ws/ { \
        proxy_pass http://127.0.0.1:8000/ws/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    # Health check endpoint \
    location /health { \
        proxy_pass http://127.0.0.1:8000/health; \
    } \
}' > /etc/nginx/sites-available/default

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /var/lib/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid

# Create startup script
RUN echo '#!/bin/bash \
set -e \
echo "Starting Rebelz App..." \
\
# Start nginx in background \
echo "Starting nginx..." \
nginx -g "daemon off;" & \
\
# Start FastAPI backend \
echo "Starting FastAPI backend..." \
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2 \
' > /app/start.sh && chmod +x /app/start.sh

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port 80 (nginx serves both frontend and proxies API)
EXPOSE 80

# Start both services
CMD ["/app/start.sh"]
