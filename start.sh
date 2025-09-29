#!/bin/bash
set -e

echo "Starting Rebelz App..."

# Start nginx in background
echo "Starting nginx..."
nginx -g "daemon off;" &

# Start FastAPI backend
echo "Starting FastAPI backend..."
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
