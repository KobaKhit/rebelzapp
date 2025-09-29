#!/usr/bin/env python3
"""
Security validation script for production deployment.
Run this before deploying to ensure security best practices.
"""

import os
import sys
from pathlib import Path
import secrets
import string

def check_secret_key():
    """Check if SECRET_KEY is secure."""
    secret_key = os.getenv("SECRET_KEY", "")
    
    if not secret_key or secret_key == "change_me":
        print("❌ SECRET_KEY is not set or using default value!")
        print("   Generate a secure key with: openssl rand -hex 32")
        return False
    
    if len(secret_key) < 32:
        print("❌ SECRET_KEY is too short! Should be at least 32 characters.")
        return False
    
    print("✅ SECRET_KEY is properly configured")
    return True

def check_database_config():
    """Check database configuration."""
    db_url = os.getenv("DATABASE_URL", "")
    
    if not db_url or "sqlite" in db_url.lower():
        print("❌ Using SQLite in production is not recommended!")
        print("   Use PostgreSQL for production: postgresql://user:pass@host:port/db")
        return False
    
    if "postgresql" not in db_url.lower():
        print("⚠️  Database URL doesn't appear to be PostgreSQL")
    
    print("✅ Database configuration looks good")
    return True

def check_cors_origins():
    """Check CORS configuration."""
    origins = os.getenv("ALLOWED_ORIGINS", "*")
    
    if origins == "*":
        print("❌ CORS is allowing all origins! This is insecure for production.")
        print("   Set ALLOWED_ORIGINS to your specific domain(s)")
        return False
    
    if "localhost" in origins or "127.0.0.1" in origins:
        print("⚠️  CORS includes localhost origins - remove these for production")
    
    print("✅ CORS origins are properly restricted")
    return True

def check_environment():
    """Check environment configuration."""
    env = os.getenv("ENV", "development")
    debug = os.getenv("DEBUG", "true").lower()
    
    if env != "production":
        print("❌ ENV is not set to 'production'")
        return False
    
    if debug == "true":
        print("❌ DEBUG is enabled in production!")
        return False
    
    print("✅ Environment is properly configured for production")
    return True

def check_file_permissions():
    """Check file permissions for sensitive files."""
    sensitive_files = [".env", "app.db"]
    issues = []
    
    for file_path in sensitive_files:
        if os.path.exists(file_path):
            stat = os.stat(file_path)
            # Check if file is readable by others
            if stat.st_mode & 0o044:
                issues.append(f"{file_path} is readable by others")
    
    if issues:
        print("❌ File permission issues:")
        for issue in issues:
            print(f"   {issue}")
        print("   Fix with: chmod 600 .env")
        return False
    
    print("✅ File permissions are secure")
    return True

def check_docker_security():
    """Check Docker configuration for security."""
    compose_file = Path("docker-compose.yml")
    
    if not compose_file.exists():
        print("⚠️  docker-compose.yml not found")
        return True
    
    content = compose_file.read_text()
    
    # Check for exposed database ports
    if "5432:5432" in content and "ports:" in content:
        print("❌ PostgreSQL port is exposed! Remove port mapping for security.")
        return False
    
    print("✅ Docker configuration is secure")
    return True

def check_api_docs():
    """Check if API docs are disabled in production."""
    enable_docs = os.getenv("ENABLE_DOCS", "false").lower()
    
    if enable_docs == "true":
        print("❌ API documentation is enabled in production!")
        print("   Set ENABLE_DOCS=false for security")
        return False
    
    print("✅ API documentation is properly disabled")
    return True

def generate_secure_passwords():
    """Generate secure passwords for services."""
    print("\n🔐 Secure password suggestions:")
    
    # Generate secure passwords
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    
    passwords = {
        "SECRET_KEY": secrets.token_hex(32),
        "POSTGRES_PASSWORD": ''.join(secrets.choice(alphabet) for _ in range(24)),
        "REDIS_PASSWORD": ''.join(secrets.choice(alphabet) for _ in range(20)),
    }
    
    for name, password in passwords.items():
        print(f"   {name}={password}")
    
    print("\n   Copy these to your .env file!")

def main():
    """Run all security checks."""
    print("🔍 Running security validation for production deployment...\n")
    
    # Load environment variables from .env if it exists
    env_file = Path(".env")
    if env_file.exists():
        from dotenv import load_dotenv
        load_dotenv()
    else:
        print("⚠️  .env file not found - using system environment variables\n")
    
    checks = [
        check_secret_key,
        check_database_config,
        check_cors_origins,
        check_environment,
        check_file_permissions,
        check_docker_security,
        check_api_docs,
    ]
    
    passed = 0
    total = len(checks)
    
    for check in checks:
        if check():
            passed += 1
        print()
    
    print(f"📊 Security Check Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All security checks passed! Ready for deployment.")
        return 0
    else:
        print("⚠️  Some security issues need to be addressed before deployment.")
        generate_secure_passwords()
        return 1

if __name__ == "__main__":
    sys.exit(main())
