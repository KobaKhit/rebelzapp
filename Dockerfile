# Unified Dockerfile for Full-Stack Rebelz App
# Builds both frontend and backend in a single container

# Stage 1: Build Frontend
FROM node:20-alpine as frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies (including dev dependencies for build)
# Explicitly install the rollup binary for Alpine Linux (musl)
RUN npm install --no-save @rollup/rollup-linux-x64-musl && \
    npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Clean up dev dependencies after build to reduce image size
RUN npm prune --production

# Stage 2: Main Application
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install system dependencies including nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies using uv (much faster than pip)
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system --no-cache -r requirements.txt

# Copy backend application code
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY scripts/ ./scripts/
COPY alembic.ini ./
COPY create_admin.py ./
COPY start.sh ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Copy production nginx configuration
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Create uploads directory and temp directories for nginx
RUN mkdir -p /app/uploads /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chmod -R 755 /app/uploads /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

# Create non-root user for backend only
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

# Make startup script executable
RUN chmod +x /app/start.sh

# Run as root to allow nginx to bind to port 80
# Note: nginx will be run by root, but uvicorn will run as appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose port 80 (nginx serves both frontend and proxies API)
EXPOSE 80

# Start both services
CMD ["/app/start.sh"]
