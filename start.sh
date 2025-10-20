#!/bin/bash
set -e

echo "Starting Rebelz App..."

# Start nginx in background with custom config (runs as root)
echo "Starting nginx..."
nginx -c /etc/nginx/nginx.conf -g "daemon off;" &

# Start FastAPI backend as appuser (for security)
echo "Starting FastAPI backend..."
su -s /bin/bash -c "uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2" appuser
