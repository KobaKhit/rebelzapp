# Deployment Fix - PostgreSQL Driver

## Issue
During deployment, you may encounter this error:
```
ModuleNotFoundError: No module named 'psycopg2'
```

## Solution Applied

### ✅ Fixed: Added `psycopg2-binary` to requirements.txt

The `psycopg2-binary` package has been added to `requirements.txt`. This is the PostgreSQL database adapter required by SQLAlchemy to connect to PostgreSQL databases.

**Updated requirements.txt:**
```
psycopg2-binary==2.9.9  # PostgreSQL adapter (required for production)
psycopg[binary]==3.2.3  # Modern PostgreSQL adapter (optional, for future use)
```

## Why Both Drivers?

- **psycopg2-binary**: Traditional driver, widely compatible with SQLAlchemy
- **psycopg3**: Modern driver, better performance but requires explicit configuration

For now, we use `psycopg2-binary` as it works out of the box with the standard PostgreSQL connection URL format.

## Deployment Steps

### 1. Rebuild Your Application

If deploying with Docker:
```bash
# Rebuild the Docker image
docker-compose build

# Or if using Docker directly
docker build -t rebelzapp .
```

If deploying to DigitalOcean App Platform:
```bash
# Push changes to your repository
git add requirements.txt
git commit -m "Add psycopg2-binary for PostgreSQL support"
git push origin main

# DigitalOcean will automatically rebuild
```

### 2. Verify Installation

After deployment, you can verify the driver is installed:
```bash
python -c "import psycopg2; print(f'psycopg2 version: {psycopg2.__version__}')"
```

### 3. Test Database Connection

Use the test script to verify connectivity:
```bash
python scripts/test_db_connection.py
```

## Alternative: Using psycopg3 (Advanced)

If you prefer to use the modern `psycopg3` driver instead, update your DATABASE_URL:

**Current format (psycopg2):**
```
postgresql://user:pass@host:port/db?sslmode=require
```

**psycopg3 format:**
```
postgresql+psycopg://user:pass@host:port/db?sslmode=require
```

Note the `+psycopg` after `postgresql`.

## Production Checklist

After fixing the driver issue:

- [ ] `psycopg2-binary` is in requirements.txt
- [ ] Application rebuilds successfully
- [ ] Database connection test passes
- [ ] Migrations run successfully: `alembic upgrade head`
- [ ] Application starts without errors
- [ ] API endpoints are accessible
- [ ] Frontend can communicate with backend

## Common Issues

### Issue: "SSL connection required"
**Solution:** Ensure your DATABASE_URL includes `?sslmode=require`

### Issue: "Connection refused"
**Solution:** 
- Verify your app is in the same VPC as the database
- Check database firewall settings
- Confirm the host and port are correct

### Issue: "Authentication failed"
**Solution:** Double-check username and password in your DATABASE_URL

### Issue: Build fails with "no matching distribution"
**Solution:** 
- Ensure you're using Python 3.11 (as specified in Dockerfile)
- Check that requirements.txt has no syntax errors

## Need Help?

1. Check the deployment logs for specific error messages
2. Run `python scripts/test_db_connection.py` to diagnose connection issues
3. Verify environment variables are set correctly
4. Review `DIGITALOCEAN_SETUP.md` for detailed configuration

## Summary

The fix is simple: **`psycopg2-binary` has been added to requirements.txt**. Just rebuild and redeploy your application, and the PostgreSQL connection should work!

