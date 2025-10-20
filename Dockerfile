# Unified Dockerfile for Full-Stack Rebelz App
# Builds both frontend and backend in a single container

# Stage 1: Build Frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies (including dev dependencies for build)
RUN npm ci

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
COPY alembic.ini ./
COPY create_admin.py ./
COPY start.sh ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Create nginx configuration for serving frontend + API
RUN printf 'pid /tmp/nginx.pid;\n\
error_log /tmp/nginx_error.log;\n\
\n\
events {\n\
    worker_connections 1024;\n\
}\n\
\n\
http {\n\
    include /etc/nginx/mime.types;\n\
    default_type application/octet-stream;\n\
    \n\
    access_log /tmp/nginx_access.log;\n\
    client_body_temp_path /tmp/client_temp;\n\
    proxy_temp_path /tmp/proxy_temp_path;\n\
    fastcgi_temp_path /tmp/fastcgi_temp;\n\
    uwsgi_temp_path /tmp/uwsgi_temp;\n\
    scgi_temp_path /tmp/scgi_temp;\n\
    \n\
    sendfile on;\n\
    keepalive_timeout 65;\n\
    \n\
    server {\n\
        listen 8080;\n\
        server_name _;\n\
        \n\
        # Serve frontend static files\n\
        location / {\n\
            root /app/frontend/dist;\n\
            try_files $uri $uri/ /index.html;\n\
        }\n\
        \n\
        # Proxy API requests to FastAPI backend\n\
        location /api/ {\n\
            proxy_pass http://127.0.0.1:8000/;\n\
            proxy_set_header Host $host;\n\
            proxy_set_header X-Real-IP $remote_addr;\n\
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
            proxy_set_header X-Forwarded-Proto $scheme;\n\
        }\n\
        \n\
        # Proxy WebSocket connections\n\
        location /ws/ {\n\
            proxy_pass http://127.0.0.1:8000/ws/;\n\
            proxy_http_version 1.1;\n\
            proxy_set_header Upgrade $http_upgrade;\n\
            proxy_set_header Connection "upgrade";\n\
            proxy_set_header Host $host;\n\
            proxy_set_header X-Real-IP $remote_addr;\n\
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
            proxy_set_header X-Forwarded-Proto $scheme;\n\
        }\n\
        \n\
        # Health check endpoint\n\
        location /health {\n\
            proxy_pass http://127.0.0.1:8000/health;\n\
        }\n\
    }\n\
}\n\
' > /etc/nginx/nginx.conf

# Create uploads directory and temp directories for nginx
RUN mkdir -p /app/uploads /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chmod -R 755 /app/uploads /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

# Make startup script executable
RUN chmod +x /app/start.sh

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose port 8080 (nginx serves both frontend and proxies API)
EXPOSE 8080

# Start both services
CMD ["/app/start.sh"]
