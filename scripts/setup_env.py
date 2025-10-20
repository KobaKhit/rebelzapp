#!/usr/bin/env python3
"""
Script to set up .env file for development or production environment.
Supports both local database (development) and DigitalOcean (production).
"""

import os
import secrets
import shutil
from pathlib import Path


def generate_secret_key() -> str:
    """Generate a secure secret key."""
    return secrets.token_hex(32)


def create_development_env():
    """Create .env file for development with local database."""
    project_root = Path(__file__).parent.parent
    env_file = project_root / ".env"
    template_file = project_root / "env.development.template"
    
    if not template_file.exists():
        print(f"❌ Template file not found: {template_file}")
        return
    
    # Check if .env already exists
    if env_file.exists():
        response = input(".env file already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Aborted. No changes made.")
            return
    
    # Copy template to .env
    try:
        shutil.copy(template_file, env_file)
        print(f"\n✅ Successfully created development .env file at: {env_file}")
        print("\n📝 Development environment configured with:")
        print("   - Local SQLite database (no setup required)")
        print("   - Debug mode enabled")
        print("   - API docs enabled at http://localhost:8000/docs")
        print("   - CORS allows all origins")
        print("\n📝 Next steps:")
        print("   1. (Optional) Add your OpenAI API key to .env")
        print("   2. Run database migrations: alembic upgrade head")
        print("   3. Create an admin user: python create_admin.py")
        print("   4. Start the application: uvicorn app.main:app --reload")
        print("\n💡 To use PostgreSQL instead of SQLite:")
        print("   1. Edit .env and uncomment the PostgreSQL DATABASE_URL")
        print("   2. Run: docker-compose -f docker-compose.dev.yml up db")
        
    except Exception as e:
        print(f"\n❌ Error creating .env file: {e}")


def create_production_env():
    """Create .env file for production with DigitalOcean database."""
    project_root = Path(__file__).parent.parent
    env_file = project_root / ".env"
    template_file = project_root / "env.production.template"
    
    if not template_file.exists():
        print(f"❌ Template file not found: {template_file}")
        return
    
    # Check if .env already exists
    if env_file.exists():
        response = input(".env file already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Aborted. No changes made.")
            return
    
    # Generate a secure secret key
    secret_key = generate_secret_key()
    
    # Get user inputs for customizable fields
    print("\n=== Production Configuration ===\n")
    print("Please provide your database and application information:\n")
    
    # Database credentials
    print("📊 Database Configuration:")
    db_user = input("  Database username (e.g., doadmin): ").strip()
    if not db_user:
        db_user = "your_db_username"
    
    db_password = input("  Database password: ").strip()
    if not db_password:
        db_password = "your_db_password"
    
    db_host = input("  Database host (e.g., xxx.db.ondigitalocean.com): ").strip()
    if not db_host:
        db_host = "your-host.db.ondigitalocean.com"
    
    db_port = input("  Database port (default: 25060): ").strip()
    if not db_port:
        db_port = "25060"
    
    db_name = input("  Database name (default: defaultdb): ").strip()
    if not db_name:
        db_name = "defaultdb"
    
    # Application settings
    print("\n🌐 Application Configuration:")
    allowed_origins = input("  Allowed CORS origins (comma-separated, e.g., https://example.com): ").strip()
    if not allowed_origins:
        allowed_origins = "https://your-domain.com,https://www.your-domain.com"
    
    vite_api_base_url = input("  API base URL (e.g., https://api.example.com): ").strip()
    if not vite_api_base_url:
        vite_api_base_url = "https://your-domain.com"
    
    openai_api_key = input("  OpenAI API key (optional, press Enter to skip): ").strip()
    if not openai_api_key:
        openai_api_key = "your_openai_api_key_here"
    
    redis_password = input("  Redis password (or press Enter to use default): ").strip()
    if not redis_password:
        redis_password = "your_redis_password"
    
    # Build database URL
    database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?sslmode=require"
    
    # Read template and replace placeholders
    try:
        with open(template_file, 'r') as f:
            content = f.read()
        
        # Replace placeholders
        content = content.replace(
            "SECRET_KEY=your_super_secure_secret_key_here_at_least_32_chars_long",
            f"SECRET_KEY={secret_key}"
        )
        content = content.replace(
            "DATABASE_URL=postgresql://username:password@your-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require",
            f"DATABASE_URL={database_url}"
        )
        content = content.replace(
            "POSTGRES_DB=defaultdb",
            f"POSTGRES_DB={db_name}"
        )
        content = content.replace(
            "POSTGRES_USER=your_db_username",
            f"POSTGRES_USER={db_user}"
        )
        content = content.replace(
            "POSTGRES_PASSWORD=your_db_password",
            f"POSTGRES_PASSWORD={db_password}"
        )
        content = content.replace(
            "ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com",
            f"ALLOWED_ORIGINS={allowed_origins}"
        )
        content = content.replace(
            "VITE_API_BASE_URL=https://your-domain.com",
            f"VITE_API_BASE_URL={vite_api_base_url}"
        )
        content = content.replace(
            "OPENAI_API_KEY=your_openai_api_key_here",
            f"OPENAI_API_KEY={openai_api_key}"
        )
        content = content.replace(
            "REDIS_PASSWORD=your_redis_password",
            f"REDIS_PASSWORD={redis_password}"
        )
        content = content.replace(
            "redis://:your_redis_password@redis:6379/0",
            f"redis://:{redis_password}@redis:6379/0"
        )
        
        # Write .env file
        with open(env_file, 'w') as f:
            f.write(content)
        
        print(f"\n✅ Successfully created production .env file at: {env_file}")
        print(f"\n🔑 Generated SECRET_KEY: {secret_key}")
        print(f"\n📊 Database configured:")
        print(f"   - Host: {db_host}")
        print(f"   - Port: {db_port}")
        print(f"   - Database: {db_name}")
        print(f"   - User: {db_user}")
        print("\n📝 Production environment configured with:")
        print("   - PostgreSQL database with SSL")
        print("   - Debug mode disabled")
        print("   - API docs disabled")
        print("   - CORS restricted to specified domains")
        print("\n⚠️  IMPORTANT: Keep your .env file secure and never commit it to version control!")
        print("\n📝 Next steps:")
        print("   1. Test connection: python scripts/test_db_connection.py")
        print("   2. Run database migrations: alembic upgrade head")
        print("   3. Create an admin user: python create_admin.py")
        print("   4. Deploy your application")
        
    except Exception as e:
        print(f"\n❌ Error creating .env file: {e}")


def main():
    """Main function."""
    print("=" * 70)
    print("Environment Setup - Rebelz API")
    print("=" * 70)
    print("\nThis script will help you set up your .env file.\n")
    print("Choose your environment:")
    print("  1. Development (local database - SQLite or PostgreSQL)")
    print("  2. Production (DigitalOcean PostgreSQL)")
    print()
    
    choice = input("Enter your choice (1 or 2): ").strip()
    
    if choice == "1":
        print("\n📦 Setting up DEVELOPMENT environment...")
        create_development_env()
    elif choice == "2":
        print("\n🚀 Setting up PRODUCTION environment...")
        create_production_env()
    else:
        print("\n❌ Invalid choice. Please run the script again and choose 1 or 2.")


if __name__ == "__main__":
    main()

