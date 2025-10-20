# 🚀 Quick Start - Rebelz App

Choose your path and get started in minutes!

## 🎯 Choose Your Environment

### 🔧 Development (Local Machine)
Perfect for coding, testing, and learning.
- Uses SQLite (no database setup needed)
- Full debug mode and API documentation
- Fast and easy to get started

### 🚀 Production (DigitalOcean)
Ready for deployment with managed database.
- Uses DigitalOcean PostgreSQL
- Production-ready security settings
- SSL encryption enabled

---

## 📦 Development Setup (3 Steps)

### Step 1: Configure Environment
```bash
python scripts/setup_env.py
# Choose option 1 (Development)
```

### Step 2: Initialize Database
```bash
pip install -r requirements.txt
alembic upgrade head
python create_admin.py
```

### Step 3: Start Application
```bash
# Backend
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Login:**
- Email: admin@example.com
- Password: admin12345

---

## 🌐 Production Setup (4 Steps)

### Step 1: Configure Environment
```bash
python scripts/setup_env.py
# Choose option 2 (Production)
# Enter your domain and API URL when prompted
```

### Step 2: Test Database Connection
```bash
python scripts/test_db_connection.py
```

### Step 3: Initialize Database
```bash
pip install -r requirements.txt
alembic upgrade head
python create_admin.py
```

### Step 4: Deploy
```bash
# Using Docker
docker-compose up -d

# Or using the deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Important:** Ensure your application is deployed in the same VPC as the DigitalOcean database.

---

## 🔄 Switch Environments

Need to switch? Just run the setup script again:
```bash
python scripts/setup_env.py
```

---

## 🆘 Having Issues?

### Test Your Connection
```bash
python scripts/test_db_connection.py
```

### Common Issues

**Can't connect to database?**
- Development: Make sure `.env` exists
- Production: Verify VPC configuration

**Import errors?**
```bash
pip install -r requirements.txt
```

**Database tables missing?**
```bash
alembic upgrade head
```

**Need admin access?**
```bash
python create_admin.py
```

---

## 📚 Learn More

- **Detailed Setup**: See `SETUP_COMPLETE.md`
- **Database Config**: See `DIGITALOCEAN_SETUP.md`
- **Full Documentation**: See `README.md`

---

## ✨ That's It!

You're ready to start building with Rebelz! 🎉

**Development**: Code → Test → Repeat
**Production**: Deploy → Monitor → Scale

Need help? Check the documentation files listed above.

