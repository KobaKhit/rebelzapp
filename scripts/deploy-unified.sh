#!/bin/bash

# Unified Deployment Script for Rebelz App
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Rebelz App Unified Deployment..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📋 Creating .env from template..."
    cp env.example .env
    echo "✅ .env created. Please edit it with your values:"
    echo "   - SECRET_KEY (generate with: openssl rand -hex 32)"
    echo "   - POSTGRES_PASSWORD"
    echo "   - REDIS_PASSWORD" 
    echo "   - ALLOWED_ORIGINS (your domain)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Run security check
echo "🔍 Running security validation..."
if command -v python3 &> /dev/null; then
    python3 scripts/security-check.py
elif command -v python &> /dev/null; then
    python scripts/security-check.py
else
    echo "⚠️  Python not found, skipping security check"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

echo "🏗️  Building and starting containers..."

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start
echo "🔨 Building unified container..."
docker-compose build --no-cache

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose ps

# Test health endpoint
echo "🏥 Testing health endpoint..."
sleep 5
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️  Health check failed, but services may still be starting..."
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📱 Your app is available at:"
echo "   Frontend: http://localhost/"
echo "   API: http://localhost/api/"
echo "   Health: http://localhost/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop app: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""
echo "🔍 To monitor your app:"
echo "   docker-compose logs -f app"
