#!/bin/bash

# EduOrg Development Setup Script
set -e

echo "🚀 Setting up EduOrg development environment..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Setup backend
echo "📦 Setting up Python backend..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt

# Create database and run migrations
echo "🗄️  Setting up database..."
python scripts/seed.py

# Setup frontend
echo "🎨 Setting up React frontend..."
cd frontend
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  Backend:  uvicorn app.main:app --reload --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Default admin credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin12345"