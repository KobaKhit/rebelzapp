#!/usr/bin/env python3
"""
Script to verify deployment readiness.
Checks that all required packages and configurations are in place.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def check_imports():
    """Check that all required packages can be imported."""
    print("\n" + "=" * 70)
    print("Checking Required Packages")
    print("=" * 70)
    
    required_packages = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("sqlalchemy", "SQLAlchemy"),
        ("alembic", "Alembic"),
        ("psycopg2", "psycopg2 (PostgreSQL driver)"),
        ("jose", "python-jose"),
        ("passlib", "passlib"),
        ("dotenv", "python-dotenv"),
    ]
    
    all_ok = True
    for module_name, display_name in required_packages:
        try:
            __import__(module_name)
            print(f"✅ {display_name}")
        except ImportError as e:
            print(f"❌ {display_name} - {str(e)}")
            all_ok = False
    
    return all_ok


def check_environment():
    """Check environment configuration."""
    print("\n" + "=" * 70)
    print("Checking Environment Configuration")
    print("=" * 70)
    
    try:
        from app.core.config import get_settings
        settings = get_settings()
        
        print(f"✅ Environment: {settings.env}")
        print(f"✅ Database URL configured: {settings.database_url[:20]}...")
        
        if settings.env == "production":
            if settings.secret_key == "change_me" or len(settings.secret_key) < 32:
                print("⚠️  WARNING: SECRET_KEY should be changed in production!")
                return False
            else:
                print("✅ SECRET_KEY is configured")
            
            if settings.debug:
                print("⚠️  WARNING: DEBUG should be False in production!")
                return False
            else:
                print("✅ Debug mode is disabled")
            
            if settings.database_url.startswith("sqlite"):
                print("⚠️  WARNING: Using SQLite in production is not recommended!")
                return False
            else:
                print("✅ Using production database")
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        return False


def check_database_driver():
    """Check PostgreSQL driver specifically."""
    print("\n" + "=" * 70)
    print("Checking PostgreSQL Driver")
    print("=" * 70)
    
    try:
        import psycopg2
        print(f"✅ psycopg2 installed (version {psycopg2.__version__})")
        return True
    except ImportError:
        print("❌ psycopg2 not installed!")
        print("\n   Install with: pip install psycopg2-binary")
        return False


def check_database_connection():
    """Test database connection."""
    print("\n" + "=" * 70)
    print("Testing Database Connection")
    print("=" * 70)
    
    try:
        from sqlalchemy import create_engine, text
        from app.core.config import get_settings
        
        settings = get_settings()
        engine = create_engine(settings.database_url)
        
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
            return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def main():
    """Main verification function."""
    print("=" * 70)
    print("Deployment Verification Script")
    print("=" * 70)
    
    checks = [
        ("Package Imports", check_imports),
        ("PostgreSQL Driver", check_database_driver),
        ("Environment Config", check_environment),
        ("Database Connection", check_database_connection),
    ]
    
    results = {}
    for check_name, check_func in checks:
        try:
            results[check_name] = check_func()
        except Exception as e:
            print(f"\n❌ {check_name} check failed with error: {e}")
            results[check_name] = False
    
    # Summary
    print("\n" + "=" * 70)
    print("Verification Summary")
    print("=" * 70)
    
    for check_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {check_name}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 70)
    if all_passed:
        print("🎉 All checks passed! Ready for deployment.")
        print("=" * 70)
        print("\n📝 Next steps:")
        print("   1. Run migrations: alembic upgrade head")
        print("   2. Create admin user: python create_admin.py")
        print("   3. Deploy your application")
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        print("=" * 70)
        print("\n📝 Common fixes:")
        print("   - Install missing packages: pip install -r requirements.txt")
        print("   - Configure .env file: python scripts/setup_env.py")
        print("   - Check DATABASE_URL in .env")
    
    print()
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())

