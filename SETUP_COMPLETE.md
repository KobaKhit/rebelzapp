# 🎉 Database Setup Complete!

Your Rebelz application is now configured to support both **local development** and **production deployment** with DigitalOcean PostgreSQL!

## 📦 What's Been Set Up

### ✅ Environment Configuration Files
| File | Purpose |
|------|---------|
| `env.example` | General template with all configuration options |
| `env.development.template` | Pre-configured for local development (SQLite) |
| `env.production.template` | Pre-configured with DigitalOcean database |

### ✅ Setup Tools
| Tool | Description |
|------|-------------|
| `scripts/setup_env.py` | Interactive script to configure your environment |
| `scripts/test_db_connection.py` | Test database connectivity |

### ✅ Documentation
| Document | Content |
|----------|---------|
| `DATABASE_SETUP_SUMMARY.md` | Quick reference guide |
| `DIGITALOCEAN_SETUP.md` | Detailed database configuration guide |
| `README.md` | Updated with new setup instructions |

## 🚀 Quick Start Guide

### Step 1: Choose Your Environment

**For Local Development:**
```bash
python scripts/setup_env.py
# Choose option 1 (Development)
```

**For Production (DigitalOcean):**
```bash
python scripts/setup_env.py
# Choose option 2 (Production)
# Follow the prompts
```

### Step 2: Test the Connection
```bash
python scripts/test_db_connection.py
```

### Step 3: Initialize the Database
```bash
# Run migrations
alembic upgrade head

# Create admin user
python create_admin.py
```

### Step 4: Start the Application
```bash
# Development
uvicorn app.main:app --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 🔄 Environment Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| **Database** | SQLite (local file) | DigitalOcean PostgreSQL |
| **Setup Required** | None | VPC configuration |
| **SSL/TLS** | Not required | Required (`sslmode=require`) |
| **Debug Mode** | ✅ Enabled | ❌ Disabled |
| **API Docs** | ✅ Enabled at `/docs` | ❌ Disabled |
| **CORS** | Allow all origins | Restricted to domains |
| **Secret Key** | Simple dev key | Cryptographically secure |
| **Performance** | Good for development | Optimized for production |

## 🗄️ Database Details

### Development Database
```
Type: SQLite
Location: ./app.db (local file)
Connection: sqlite:///./app.db
Setup: Automatic (no configuration needed)
```

### Production Database (DigitalOcean)
```
Type: PostgreSQL 15
Host: <your-database-host>.db.ondigitalocean.com
Port: 25060
Database: defaultdb
Username: <your-db-username>
Password: <your-db-password>
SSL Mode: require
Connection: Configure using python scripts/setup_env.py
```

> **Security Note**: Use the interactive setup script to configure your database credentials. The script will prompt you for your actual database connection details and create a secure `.env` file. Never commit real passwords to version control.

## 🛠️ Available Commands

### Environment Setup
```bash
# Interactive setup (recommended)
python scripts/setup_env.py

# Manual setup
cp env.development.template .env  # For development
cp env.production.template .env   # For production
```

### Database Operations
```bash
# Test connection
python scripts/test_db_connection.py

# Run migrations
alembic upgrade head

# Create migration
alembic revision --autogenerate -m "description"

# Rollback migration
alembic downgrade -1
```

### Application Management
```bash
# Start development server
uvicorn app.main:app --reload

# Start production server
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Create admin user
python create_admin.py

# Seed database (development only)
python scripts/seed.py
```

## 🔒 Security Checklist

### Development
- ✅ SQLite database (local only)
- ✅ Debug mode for easier troubleshooting
- ✅ CORS allows all origins
- ⚠️ Use simple secret key (not for production!)

### Production
- ✅ PostgreSQL with SSL encryption
- ✅ Secure secret key (auto-generated)
- ✅ CORS restricted to specific domains
- ✅ Debug mode disabled
- ✅ API docs disabled
- ✅ VPC network isolation
- ⚠️ Never commit `.env` to version control
- ⚠️ Keep database credentials secure

## 📋 Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] `.env` file is configured with production settings
- [ ] `SECRET_KEY` is cryptographically secure (64+ characters)
- [ ] `ALLOWED_ORIGINS` is set to your actual domain(s)
- [ ] `VITE_API_BASE_URL` points to your production API
- [ ] Database connection tested successfully
- [ ] Migrations are up to date (`alembic upgrade head`)
- [ ] Admin user is created
- [ ] Application server is in the same VPC as database
- [ ] Database firewall allows connections from your app
- [ ] SSL certificate is valid (for HTTPS)
- [ ] Environment variables are set in deployment platform

## 🆘 Troubleshooting

### Connection Issues

**Problem**: Can't connect to DigitalOcean database
```bash
# Check connection
python scripts/test_db_connection.py

# Verify:
# 1. App is in the same VPC as database
# 2. Database firewall allows your app
# 3. SSL is enabled in connection string
```

**Problem**: "Authentication failed"
```bash
# Verify credentials in .env match your database:
# - Check POSTGRES_USER
# - Check POSTGRES_PASSWORD
# - Ensure DATABASE_URL has correct credentials
```

**Problem**: "SSL connection required"
```bash
# Ensure DATABASE_URL ends with: ?sslmode=require
```

### Migration Issues

**Problem**: "No such table"
```bash
# Run migrations
alembic upgrade head
```

**Problem**: Migration conflicts
```bash
# Check migration history
alembic current

# Rollback if needed
alembic downgrade -1
```

### Environment Issues

**Problem**: Wrong environment loaded
```bash
# Check ENV variable in .env
ENV=development  # or 'production'

# Verify with:
python -c "from app.core.config import get_settings; print(get_settings().env)"
```

## 📚 Additional Resources

- **Quick Reference**: `DATABASE_SETUP_SUMMARY.md`
- **Detailed Guide**: `DIGITALOCEAN_SETUP.md`
- **Main Documentation**: `README.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Security Guide**: `SECURITY_SUMMARY.md`

## 🎯 Next Steps

1. **Choose your environment** and run the setup script
2. **Test the database connection** to ensure everything works
3. **Run migrations** to create database tables
4. **Create an admin user** for initial access
5. **Start developing** or deploy to production!

## 💡 Tips

- Use **development** environment for local coding and testing
- Use **production** environment for deployment to DigitalOcean
- Run `python scripts/test_db_connection.py` after any configuration changes
- Keep your `.env` file secure and never commit it to Git
- Use the setup script whenever you need to switch environments
- Test locally before deploying to production

---

**Need Help?**
- Check the troubleshooting section above
- Review `DIGITALOCEAN_SETUP.md` for detailed instructions
- Ensure all prerequisites are met
- Verify your `.env` file configuration

**Ready to go!** 🚀

