# 🎓 Rebelz App - Educational Organization Management Platform

A comprehensive full-stack platform for managing educational organizations with modern web technologies, featuring unified deployment, enterprise security, and AI integration.

## 🚀 Features

### Core Functionality
- **User Management**: Complete user lifecycle with role-based access control (RBAC)
- **Event Management**: Modular event system supporting multiple event types
- **Registration System**: Event registration with capacity management and waitlists
- **Attendance Tracking**: Check-in/check-out system with reporting
- **AI Assistant**: Context-aware LLM integration for enhanced user experience

### Event Types
- **Academic Classes**: Traditional courses with instructor, materials, and prerequisites
- **Sports Classes**: Fitness activities with skill levels and equipment management
- **Workshops**: Hands-on learning with objectives and certifications
- **Seminars**: Educational lectures with speaker information
- **Camps**: Multi-day programs with schedules and logistics
- **Competitions**: Tournaments with categories, rules, and prizes
- **Community Events**: Social gatherings with activities and volunteers
- **Conferences**: Professional events with tracks and networking

### User Roles & Permissions
- **Admin**: Full system access and user management
- **Instructor**: Event creation and management, attendance tracking
- **Student**: Event registration and profile management

### Technology Stack
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, JWT authentication
- **Frontend**: React, TypeScript, Tailwind CSS, React Query  
- **AI**: OpenAI API integration with fallback stub responses
- **Security**: Rate limiting, security headers, request monitoring
- **DevOps**: Unified Docker container, PostgreSQL, Redis, uv for fast Python installs
- **Deployment**: Single container with Nginx reverse proxy

## ✨ **Unified Deployment Benefits**

- 🏗️ **Single Container**: Frontend + Backend + Nginx in one container
- 🚀 **Simpler Setup**: No need to coordinate multiple services
- 💰 **Lower Cost**: Uses fewer resources on hosting platforms
- 🔧 **Easier Management**: One container to manage instead of three
- 🌐 **No CORS Issues**: Frontend and API served from same domain
- 🔒 **Enterprise Security**: Rate limiting, headers, monitoring included
- ⚡ **Fast Builds**: uv for lightning-fast Python dependency installation

## 🚀 Quick Start

### **Option 1: Automated Setup (Recommended)**
```bash
# Clone the repository
git clone <repository-url>
cd rebelzapp

# Run the interactive setup script
python scripts/setup_env.py
# Choose 1 for Development or 2 for Production

# Run database migrations
alembic upgrade head

# Create admin user
python create_admin.py

# Start the application
uvicorn app.main:app --reload  # Development
```

### Option 2: Manual Development Setup
```bash
# Setup environment
cp env.development.template .env
# Edit .env if needed (optional for development)

# Backend setup
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python create_admin.py

# Frontend setup
cd frontend
npm install
cd ..

# Start services
uvicorn app.main:app --reload --port 8000  # Backend
cd frontend && npm run dev                 # Frontend
```

### Option 3: Production Deployment
```bash
# Setup production environment
python scripts/setup_env.py
# Choose option 2 (Production)
# Follow prompts to configure DigitalOcean database

# One-command deployment
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Access your app at http://localhost
```

### Option 4: Docker Development
```bash
docker-compose -f docker-compose.dev.yml up
```

## 🌐 Access Points

- **Frontend**: http://localhost:5173 (or 3000)
- **API Documentation**: http://localhost:8000/docs
- **API**: http://localhost:8000
- **Legacy UI**: http://localhost:8000/ui

## 🔐 Default Credentials

After running the seed script:
- **Email**: admin@example.com
- **Password**: admin12345

## 📁 Project Structure

```
eduorg/
├── app/                    # FastAPI backend
│   ├── api/               # API routes
│   │   └── routers/       # Route modules
│   ├── core/              # Configuration
│   ├── db/                # Database setup
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   └── (ui folder removed - using React frontend)
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities and API client
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
├── scripts/               # Utility scripts
├── alembic/               # Database migrations
└── docker-compose.dev.yml # Development containers
```

## 🔧 Configuration

### Quick Setup with Script
The easiest way to configure your environment:
```bash
python scripts/setup_env.py
```

This interactive script will:
- Guide you through development or production setup
- Generate secure keys automatically
- Configure the appropriate database
- Set up all required environment variables

### Environment Variables
```bash
# Required
ENV=development                  # or 'production'
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///./app.db  # or postgresql://...

# Optional
OPENAI_API_KEY=your_openai_key   # For AI features
MODEL_NAME=gpt-4o-mini           # AI model
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Database Options
- **Development**: 
  - SQLite (default, no setup required)
  - Local PostgreSQL (optional, with Docker)
- **Production**: 
  - DigitalOcean PostgreSQL (pre-configured)
  - Any PostgreSQL server with SSL support
- **Docker**: Includes PostgreSQL service

### Environment Templates
- `env.example` - General template with all options
- `env.development.template` - Pre-configured for local development
- `env.production.template` - Pre-configured for DigitalOcean

See [DIGITALOCEAN_SETUP.md](DIGITALOCEAN_SETUP.md) for detailed database configuration guide.

## 🎯 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/token` - Login
- `GET /auth/me` - Current user info

### Events
- `GET /events/` - List events (with filters)
- `POST /events/` - Create event
- `GET /events/types` - Available event types
- `GET /events/types/detailed` - Detailed type info

### Registrations
- `POST /registrations/` - Register for event
- `GET /registrations/my` - User's registrations
- `POST /registrations/attendance` - Record attendance

### Users (Admin)
- `GET /users/` - List users (with search/filters)
- `POST /users/` - Create user
- `POST /users/{id}/roles` - Assign roles

### AI Assistant
- `POST /ai/chat` - Chat with AI
- `GET /ai/suggestions` - Personalized suggestions
- `GET /ai/help/topics` - Help topics

## 🧪 Testing

```bash
# Backend tests
pytest

# Frontend tests
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e
```

## 🚀 Production Deployment

### Docker Production
```bash
docker-compose up -d
```

### Manual Deployment
1. Set production environment variables
2. Use PostgreSQL database
3. Run Alembic migrations: `alembic upgrade head`
4. Build frontend: `cd frontend && npm run build`
5. Serve with production WSGI server

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced reporting dashboard
- [ ] Integration with external calendar systems
- [ ] Payment processing for paid events
- [ ] Email/SMS notifications
- [ ] Multi-tenant support
- [ ] Advanced AI features (scheduling optimization, recommendations)

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: Check API docs at `/docs`
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

Built with ❤️ for educational organizations worldwide.