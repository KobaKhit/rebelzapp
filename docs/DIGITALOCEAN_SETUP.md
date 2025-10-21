# Database Configuration Guide

This guide explains how to configure your database for both development and production environments.

## Quick Setup

The easiest way to set up your environment is to use the setup script:

```bash
python scripts/setup_env.py
```

This interactive script will guide you through setting up either:
1. **Development environment** - Local database (SQLite or PostgreSQL)
2. **Production environment** - DigitalOcean PostgreSQL

## Environment Options

### Option 1: Development (Local Database)

For local development, you can use:
- **SQLite** (default) - No setup required, perfect for quick development
- **PostgreSQL** (optional) - More production-like environment

### Option 2: Production (DigitalOcean PostgreSQL)

For production deployment with DigitalOcean managed database:
- **Username**: `doadmin`
- **Password**: `<your-database-password>`
- **Host**: `<your-database-host>.db.ondigitalocean.com`
- **Port**: `25060`
- **Database**: `defaultdb`
- **SSL Mode**: `require`

> **Note**: Replace the placeholders with your actual DigitalOcean database credentials. Never commit real passwords to version control.

## Manual Setup Instructions

If you prefer to set up manually, follow these steps:

### Development Setup

1. Copy the development template:

```bash
# Copy development template
cp env.development.template .env
```

This will set up:
- SQLite database (no additional setup needed)
- Debug mode enabled
- API docs at http://localhost:8000/docs
- CORS allows all origins

### Production Setup

1. Copy the production template:

```bash
# Copy production template
cp env.production.template .env
```

2. Edit `.env` and update the following:
   - Generate a secure `SECRET_KEY`: `openssl rand -hex 32`
   - Set your `ALLOWED_ORIGINS` (your frontend domains)
   - Set your `VITE_API_BASE_URL` (your API URL)
   - Add your `OPENAI_API_KEY` (if using AI features)
   - Set your `REDIS_PASSWORD` (if using Redis)

The DigitalOcean database connection is already pre-configured in the template.

## Running the Application

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run Database Migrations

```bash
alembic upgrade head
```

### 3. Create Admin User

```bash
python create_admin.py
```

### 4. Start the Application

**Development:**
```bash
uvicorn app.main:app --reload
```

**Production:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Environment Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| Database | SQLite (or local PostgreSQL) | DigitalOcean PostgreSQL |
| Debug Mode | Enabled | Disabled |
| API Docs | Enabled at `/docs` | Disabled |
| CORS | Allow all origins | Restricted to specific domains |
| SSL/TLS | Not required | Required (`sslmode=require`) |
| Secret Key | Simple dev key | Cryptographically secure |

## Switching Between Environments

To switch between development and production:

1. **Development → Production:**
   ```bash
   python scripts/setup_env.py
   # Choose option 2 (Production)
   ```

2. **Production → Development:**
   ```bash
   python scripts/setup_env.py
   # Choose option 1 (Development)
   ```

Or manually edit your `.env` file and change the `ENV` and `DATABASE_URL` variables.

## Notes

- The database connection uses SSL (`sslmode=require`) for secure communication
- The connection is configured for VPC (Virtual Private Cloud) access
- Make sure your application server can reach the private hostname
- If deploying on DigitalOcean App Platform, ensure your app is in the same VPC as the database

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. **VPC Access**: Ensure your application is deployed in the same VPC as the database
2. **Firewall Rules**: Check that the database firewall allows connections from your application
3. **SSL Certificate**: The PostgreSQL driver should handle SSL automatically with `sslmode=require`

### Testing Connection Manually

You can test the connection using `psql`:

```bash
psql "postgresql://username:password@your-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
```

Or using the provided test script:

```bash
python scripts/test_db_connection.py
```

Or using Python directly:

```python
from sqlalchemy import create_engine

# Use your actual credentials
DATABASE_URL = "postgresql://username:password@your-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    result = conn.execute(text("SELECT version();"))
    print(result.fetchone())
```

