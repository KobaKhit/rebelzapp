# 🚀 Rebelz App Deployment Guide

Deploy your full-stack Rebelz app with a **single unified container** - the simplest way to get to production!

## ✨ **Unified Deployment Benefits**

- 🏗️ **Single Container**: Frontend + Backend + Nginx in one container
- 🚀 **Simpler Setup**: No need to coordinate multiple services
- 💰 **Lower Cost**: Uses fewer resources on hosting platforms
- 🔧 **Easier Management**: One container to manage instead of three
- 🌐 **No CORS Issues**: Frontend and API served from same domain

## 🔒 **Security Features Included**

- ✅ **Rate Limiting**: Redis-backed API protection (100 req/min default)
- ✅ **Security Headers**: XSS protection, CSRF prevention, CSP
- ✅ **Authentication**: JWT with bcrypt password hashing
- ✅ **Authorization**: Role-based permissions system
- ✅ **Database**: PostgreSQL with secure configuration
- ✅ **File Upload**: Size limits and type validation
- ✅ **Request Monitoring**: Suspicious activity detection
- ✅ **API Documentation**: Disabled in production

## 📦 **What's Included**

The unified container includes:
- **React Frontend** (built and served by Nginx)
- **FastAPI Backend** (Python API server)
- **Nginx Reverse Proxy** (routes requests appropriately)
- **All Security Features** (rate limiting, headers, etc.)

## 📋 **Pre-Deployment Security Checklist**

Run the security validation script:
```bash
python scripts/security-check.py
```

## 🔧 Setup Instructions

### 1. Environment Configuration

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your production values:
   ```bash
   nano .env
   ```

3. **IMPORTANT**: Generate secure credentials:
   ```bash
   # Run the security script to generate secure passwords
   python scripts/security-check.py
   ```
   Or generate manually:
   ```bash
   # Secret key for JWT tokens
   openssl rand -hex 32
   
   # Database password
   openssl rand -base64 32
   
   # Redis password
   openssl rand -base64 24
   ```

4. Update these **CRITICAL** values in your `.env`:
   - `SECRET_KEY` - Use generated key (32+ chars)
   - `POSTGRES_PASSWORD` - Strong password
   - `REDIS_PASSWORD` - Strong password
   - `ALLOWED_ORIGINS` - **YOUR DOMAIN ONLY** (e.g., `https://yourdomain.com`)
   - `VITE_API_BASE_URL` - Your API domain
   - `ENV=production` - **MUST be set to production**
   - `DEBUG=false` - **MUST be false**
   - `ENABLE_DOCS=false` - **MUST be false for security**

### 2. Quick Deployment

#### **One-Command Deployment**
```bash
# Run the automated deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### **Manual Deployment**
```bash
# Build and start everything
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 3. Digital Ocean Deployment Options

#### Option A: App Platform (Recommended - Easiest)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Deploy on App Platform:**
   - Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect your GitHub repository
   - **IMPORTANT**: Choose "Use existing app spec" and it will detect `.do/app.yaml`
   - Or manually select "Dockerfile" deployment method (not Docker Compose)
   - Set these environment variables in the dashboard:
     - `SECRET_KEY` (generate with: `openssl rand -hex 32`)
     - `ALLOWED_ORIGINS` (your domain, e.g., `https://rebelz-app.ondigitalocean.app`)
     - `POSTGRES_PASSWORD` (strong password)
     - `REDIS_PASSWORD` (strong password)
     - `OPENAI_API_KEY` (optional)
   - Deploy!

**Estimated Cost:** $12-15/month (cheaper with unified approach!)

### 🚨 **Digital Ocean Troubleshooting**

**Problem**: Digital Ocean shows two web services (ports 80 and 8080)?

**Solution**: This happens when DO auto-detects both frontend and backend as separate services.

**Fix**:
1. **Delete the existing app** in Digital Ocean dashboard
2. **Re-create** and choose **"Use existing app spec"** (it will find `.do/app.yaml`)
3. Or manually select **"Dockerfile"** (not "Docker Compose")
4. Make sure you see only **ONE** web service in the configuration

The `.do/app.yaml` file tells Digital Ocean to use our unified container instead of auto-detecting separate services.

**Problem**: Build fails with "tsc: not found" or TypeScript errors?

**Solution**: This was fixed in the Dockerfile - make sure you have the latest version that uses `npm ci` (not `npm ci --only=production`) to install dev dependencies needed for the build.

**Performance**: The Dockerfile now uses `uv` instead of `pip` for Python dependencies, making builds **10x faster**! 🚀

#### Option B: Droplet Deployment (More Control)

1. **Create Droplet:**
   - Ubuntu 22.04
   - At least 2GB RAM (4GB recommended)
   - Add your SSH key

2. **Connect and Setup:**
   ```bash
   ssh root@YOUR_DROPLET_IP
   
   # Install Docker
   apt update
   apt install -y docker.io docker-compose-v2
   systemctl start docker
   systemctl enable docker
   
   # Clone repository
   git clone https://github.com/YOUR_USERNAME/rebelzapp.git
   cd rebelzapp/rebelzapp
   ```

3. **Configure Environment:**
   ```bash
   # Create and edit .env file
   cp env.example .env
   nano .env  # Edit with your values
   ```

4. **Deploy:**
   ```bash
   # Start services
   docker-compose up -d
   
   # Check status
   docker-compose ps
   
   # View logs if needed
   docker-compose logs -f
   ```

5. **Initialize Database:**
   ```bash
   # Run migrations
   docker-compose exec backend alembic upgrade head
   
   # Create admin user
   docker-compose exec backend python create_admin.py
   ```

**Estimated Cost:** $12-24/month for droplet

### 3. Domain Setup (Optional but Recommended)

1. **Point your domain to the droplet IP**
2. **Set up SSL with Let's Encrypt:**
   ```bash
   # Install certbot
   apt install certbot python3-certbot-nginx
   
   # Get SSL certificate
   certbot --nginx -d yourdomain.com
   ```

### 4. Post-Deployment

1. **Test the application:**
   - Visit your domain or droplet IP
   - Test user registration/login
   - Test event creation
   - Test AI chat (if configured)

2. **Default Admin Credentials:**
   - Email: `admin@example.com`
   - Password: `admin12345`
   - **Change these immediately after first login!**

## 🔍 Troubleshooting

### Common Issues:

1. **Services won't start:**
   ```bash
   docker-compose logs
   ```

2. **Database connection errors:**
   - Check your `DATABASE_URL` in `.env`
   - Ensure PostgreSQL container is running: `docker-compose ps`

3. **Frontend can't reach backend:**
   - Check `VITE_API_BASE_URL` matches your domain
   - Verify CORS settings in `ALLOWED_ORIGINS`

4. **Permission denied errors:**
   - Ensure proper file permissions
   - Check Docker daemon is running

### Useful Commands:

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Access backend shell
docker-compose exec backend bash

# Access database
docker-compose exec db psql -U rebelz_user -d rebelzdb
```

## 🔒 Security Checklist

- ✅ Strong `SECRET_KEY` generated
- ✅ Secure database password
- ✅ CORS properly configured
- ✅ Non-root user in containers
- ✅ Health checks enabled
- ⬜ SSL certificate installed (recommended)
- ⬜ Firewall configured (recommended)
- ⬜ Regular backups scheduled (recommended)

## 📈 Monitoring

1. **Enable Digital Ocean monitoring**
2. **Set up log aggregation**
3. **Configure alerts for:**
   - High CPU/Memory usage
   - Service downtime
   - Database connection issues

## 🔄 Updates

To update your deployed application:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run any new migrations
docker-compose exec backend alembic upgrade head
```

## 💾 Backups

Set up automated backups for your database:

```bash
# Manual backup
docker-compose exec db pg_dump -U rebelz_user rebelzdb > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T db psql -U rebelz_user rebelzdb < backup_file.sql
```

## 🆘 Support

If you encounter issues:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Ensure all services are running: `docker-compose ps`
4. Check Digital Ocean's status page for platform issues

---

**Ready to deploy!** 🎉

Choose your deployment method and follow the instructions above. Your Rebelz app will be live on Digital Ocean!
