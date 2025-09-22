#!/usr/bin/env python3
"""Create admin user with working password hashing"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.db.database import SessionLocal, Base, engine
    from app.models import User, Role, Permission
    from app.services.security import hash_password, verify_password
    from sqlalchemy import select
    
    def create_admin():
        print("🚀 Creating admin user and basic data...")
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            # Create permissions
            permissions_data = [
                "view_events", "manage_events", "manage_users", 
                "manage_roles", "manage_permissions"
            ]
            
            print("📋 Creating permissions...")
            permissions = {}
            for perm_name in permissions_data:
                perm = db.execute(select(Permission).where(Permission.name == perm_name)).scalar_one_or_none()
                if not perm:
                    perm = Permission(name=perm_name)
                    db.add(perm)
                    db.flush()
                    print(f"  ✅ Created: {perm_name}")
                permissions[perm_name] = perm
            
            # Create admin role
            print("👑 Creating admin role...")
            admin_role = db.execute(select(Role).where(Role.name == "admin")).scalar_one_or_none()
            if not admin_role:
                admin_role = Role(name="admin")
                db.add(admin_role)
                db.flush()
                # Add all permissions to admin role
                admin_role.permissions = list(permissions.values())
                print("  ✅ Created admin role with all permissions")
            
            # Create student role
            print("🎓 Creating student role...")
            student_role = db.execute(select(Role).where(Role.name == "student")).scalar_one_or_none()
            if not student_role:
                student_role = Role(name="student")
                db.add(student_role)
                db.flush()
                student_role.permissions = [permissions["view_events"]]
                print("  ✅ Created student role")
            
            db.commit()
            
            # Create admin user
            print("👤 Creating admin user...")
            admin_email = "admin@example.com"
            admin_password = "admin12345"
            
            admin = db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none()
            if admin:
                print("  ℹ️ Admin user already exists, updating password...")
                admin.password_hash = hash_password(admin_password)
                if admin_role not in admin.roles:
                    admin.roles.append(admin_role)
            else:
                admin = User(
                    email=admin_email,
                    full_name="Administrator",
                    password_hash=hash_password(admin_password),
                    is_active=True
                )
                admin.roles.append(admin_role)
                db.add(admin)
                print("  ✅ Created new admin user")
            
            db.commit()
            
            # Test password verification
            print("🔐 Testing password verification...")
            if verify_password(admin_password, admin.password_hash):
                print("  ✅ Password verification works!")
            else:
                print("  ❌ Password verification failed!")
                return
            
            print("\n🎉 Setup complete!")
            print(f"📧 Email: {admin_email}")
            print(f"🔑 Password: {admin_password}")
            print(f"🎭 Roles: {[r.name for r in admin.roles]}")
            print("\n🌐 You can now login at: http://127.0.0.1:8000")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    if __name__ == "__main__":
        create_admin()
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure the server dependencies are installed")
