## EduOrg FastAPI

Modular FastAPI backend for education organizations: users, RBAC, events, and LLM-assisted UX.

### Features
- Modular event system with type registry (`data` JSON) for easy extension
- Users, roles, permissions with RBAC enforcement
- JWT auth (OAuth2 password flow)
- LLM abstraction and chat endpoint (OpenAI-compatible shape)
- Seed script for default roles and permissions
- Docker-ready

### Quickstart

1. Create and load env
```bash
cp .env.example .env
```

2. Install dependencies
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

3. Run the API
```bash
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs

### Database
- Default: SQLite file `app.db` (change `DATABASE_URL` in `.env`)
- Production: Use Postgres (e.g., `postgresql+psycopg2://user:pass@host:5432/db`)

### Seeding
```bash
python scripts/seed.py
```

### LLM Provider
- Set `OPENAI_API_KEY` in `.env` to enable OpenAI usage. Without it, the AI route returns a local stub response.

### Project Structure
```
app/
  api/
  core/
  db/
  models/
  schemas/
  services/
```

### License
MIT
