# DigitalOcean Environment Variables Setup

## 🎯 Required Environment Variables

Add these in your DigitalOcean App Platform UI under **Settings → Environment Variables**:

### 1. DATABASE_URL ⚠️ **CRITICAL**
```
postgresql://username:password@your-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```
- **Encrypt:** ✅ Yes
- **Why:** Connects your app to your DigitalOcean PostgreSQL database
- **Note:** Replace `username`, `password`, and `your-host` with your actual database credentials from DigitalOcean

### 2. SECRET_KEY ⚠️ **CRITICAL**
Generate a secure key first:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Then add the output (should be 64 characters long)
- **Encrypt:** ✅ Yes
- **Why:** Used for JWT tokens and security features

### 3. ALLOWED_ORIGINS ⚠️ **CRITICAL**
```
https://rebelz.app,https://www.rebelz.app
```
Or use dynamic URL:
```
${_self.PUBLIC_URL}
```
- **Encrypt:** ❌ No
- **Why:** CORS security - allows your frontend to call the API

### 4. OPENAI_API_KEY ✅ **Already Added**
- **Encrypt:** ✅ Yes
- **Why:** For AI features

### 5. VITE_API_BASE_URL (Recommended)
```
https://rebelz.app
```
Or use dynamic URL:
```
${_self.PUBLIC_URL}
```
- **Encrypt:** ❌ No
- **Why:** Tells the frontend where the API is located

## 📋 Step-by-Step Instructions

### Step 1: Access Environment Variables
1. Go to https://cloud.digitalocean.com/apps
2. Click on your **rebelzapp** application
3. Click **Settings** tab
4. Scroll to **App-Level Environment Variables** or click on your component → **Environment Variables**

### Step 2: Generate SECRET_KEY
Run this locally:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Copy the output (it will look like: `a1b2c3d4e5f6...` - 64 characters)

### Step 3: Add Each Variable
Click **Edit** or **Add Variable** and add:

| Variable Name | Value | Encrypt? |
|---------------|-------|----------|
| `DATABASE_URL` | `postgresql://doadmin:AVNS_...` (full connection string) | ✅ Yes |
| `SECRET_KEY` | (your generated 64-char key) | ✅ Yes |
| `ALLOWED_ORIGINS` | `${_self.PUBLIC_URL}` | ❌ No |
| `VITE_API_BASE_URL` | `${_self.PUBLIC_URL}` | ❌ No |

### Step 4: Save and Deploy
1. Click **Save**
2. Your app will automatically redeploy with the new variables
3. Wait for deployment to complete

## ✅ Verification

After deployment, check the logs for:
- ✅ No `ModuleNotFoundError: No module named 'psycopg2'`
- ✅ No database connection errors
- ✅ App starts successfully

## 🔍 What Each Variable Does

### Already Set (from app.yaml)
These are automatically configured:
- ✅ `ENV=production` - Runs in production mode
- ✅ `DEBUG=false` - Disables debug mode
- ✅ `ENABLE_DOCS=false` - Disables API docs in production
- ✅ `MODEL_NAME=gpt-4o-mini` - AI model to use
- ✅ `APP_NAME=Rebelz API` - Application name
- ✅ `MAX_FILE_SIZE=5242880` - Max upload size (5MB)
- ✅ `RATE_LIMIT_CALLS=100` - API rate limiting
- ✅ `RATE_LIMIT_PERIOD=60` - Rate limit period
- ✅ `ACCESS_TOKEN_EXPIRE_MINUTES=60` - JWT token expiration

### You Need to Add
- ⚠️ `DATABASE_URL` - Your database connection
- ⚠️ `SECRET_KEY` - Security key
- ⚠️ `ALLOWED_ORIGINS` - CORS settings
- ✅ `OPENAI_API_KEY` - Already added
- 📝 `VITE_API_BASE_URL` - Frontend API URL

## 🚨 Common Issues

### Issue: "Connection refused" or "Can't connect to database"
**Solution:** 
- Verify `DATABASE_URL` is correct
- Ensure your app is in the same VPC as your database
- Check database firewall settings

### Issue: "CORS error" in browser
**Solution:**
- Add `ALLOWED_ORIGINS` with your app's URL
- Use `${_self.PUBLIC_URL}` for automatic URL

### Issue: "Invalid token" or authentication errors
**Solution:**
- Ensure `SECRET_KEY` is set and is at least 32 characters
- Generate a new one if needed

## 📝 Quick Copy-Paste

For easy setup, here's what you need:

**DATABASE_URL:**
```
postgresql://username:password@your-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```
> Replace with your actual DigitalOcean database credentials

**ALLOWED_ORIGINS:**
```
https://rebelz.app,https://www.rebelz.app
```

**VITE_API_BASE_URL:**
```
https://rebelz.app
```

**SECRET_KEY:**
Generate with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## 🎉 After Setup

Once all variables are added:
1. App will automatically redeploy
2. Check deployment logs for success
3. Run migrations (if needed):
   ```bash
   # In DigitalOcean console or SSH
   alembic upgrade head
   python create_admin.py
   ```
4. Test your app!

---

**Need Help?** Check the deployment logs in DigitalOcean for specific error messages.

