#!/usr/bin/env python3
"""
Script to test database connection.
Verifies that the database is accessible and configured correctly.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.core.config import get_settings


def test_connection():
    """Test database connection."""
    settings = get_settings()
    
    print("=" * 70)
    print("Database Connection Test")
    print("=" * 70)
    print(f"\nEnvironment: {settings.env}")
    print(f"Database URL: {settings.database_url.split('@')[0]}@***")  # Hide credentials
    
    try:
        # Create engine
        print("\n[1/3] Creating database engine...")
        engine = create_engine(settings.database_url)
        
        # Test connection
        print("[2/3] Testing connection...")
        with engine.connect() as conn:
            # Execute a simple query
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
            
            # Get database version
            if settings.database_url.startswith("postgresql"):
                version_result = conn.execute(text("SELECT version()"))
                version = version_result.fetchone()[0]
                print(f"[3/3] Connected to PostgreSQL")
                print(f"\nDatabase Version:\n{version[:100]}...")
            elif settings.database_url.startswith("sqlite"):
                version_result = conn.execute(text("SELECT sqlite_version()"))
                version = version_result.fetchone()[0]
                print(f"[3/3] Connected to SQLite")
                print(f"\nDatabase Version: {version}")
            else:
                print("[3/3] Connected to database")
        
        print("\n" + "=" * 70)
        print("✅ SUCCESS: Database connection is working!")
        print("=" * 70)
        print("\n📝 Next steps:")
        print("   1. Run database migrations: alembic upgrade head")
        print("   2. Create an admin user: python create_admin.py")
        print("   3. Start the application: uvicorn app.main:app --reload")
        
        return True
        
    except Exception as e:
        print("\n" + "=" * 70)
        print("❌ ERROR: Database connection failed!")
        print("=" * 70)
        print(f"\nError details: {str(e)}")
        print("\n🔧 Troubleshooting:")
        
        if "could not connect to server" in str(e).lower():
            print("   - Check that the database server is running")
            print("   - Verify the host and port are correct")
            print("   - Ensure your app can reach the database (VPC/firewall)")
        elif "authentication failed" in str(e).lower():
            print("   - Verify the username and password are correct")
            print("   - Check that the user has access to the database")
        elif "ssl" in str(e).lower():
            print("   - Ensure SSL is properly configured")
            print("   - Check that sslmode is set correctly in DATABASE_URL")
        elif "no such table" in str(e).lower():
            print("   - Run database migrations: alembic upgrade head")
        else:
            print("   - Check your DATABASE_URL in .env file")
            print("   - Verify all connection parameters are correct")
            print("   - See docs/DIGITALOCEAN_SETUP.md for detailed setup guide")
        
        return False


def main():
    """Main function."""
    try:
        success = test_connection()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

