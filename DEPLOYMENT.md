# 🚀 Digital Ocean Deployment Guide

This guide will help you deploy the Rebelz app to Digital Ocean.

## 📋 Pre-Deployment Checklist

All production configurations have been prepared:
- ✅ Production `docker-compose.yml`
- ✅ Production frontend `Dockerfile`
- ✅ Nginx configuration
- ✅ Environment template (`env.example`)
- ✅ Optimized backend Dockerfile

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

3. **IMPORTANT**: Generate a secure secret key:
   ```bash
   openssl rand -hex 32
   ```
   Copy this output to your `SECRET_KEY` in `.env`

4. Update these values in your `.env`:
   - `SECRET_KEY` - Use the generated key above
   - `DATABASE_URL` - Keep as is for Docker setup
   - `POSTGRES_PASSWORD` - Choose a strong password
   - `ALLOWED_ORIGINS` - Your domain (e.g., `https://yourdomain.com`)
   - `VITE_API_BASE_URL` - Your domain (e.g., `https://yourdomain.com`)
   - `OPENAI_API_KEY` - Optional, for AI features

### 2. Digital Ocean Deployment Options

#### Option A: App Platform (Recommended - Easiest)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add production configuration"
   git push origin main
   ```

2. **Deploy on App Platform:**
   - Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect your GitHub repository
   - Select "Docker Compose" as deployment method
   - Set environment variables in the dashboard (copy from your `.env`)
   - Deploy!

**Estimated Cost:** $12-25/month

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
