from __future__ import annotations

from sqlalchemy import select

from app.db.database import Base, SessionLocal, engine
from app.models import Permission, Role, User
from app.services.security import hash_password


DEFAULT_PERMISSIONS = [
	"view_events",
	"manage_events",
	"manage_users",
	"manage_roles",
	"manage_permissions",
]

DEFAULT_ROLES = {
	"student": ["view_events"],
	"instructor": ["view_events", "manage_events"],
	"admin": DEFAULT_PERMISSIONS,
}


def seed() -> None:
	Base.metadata.create_all(bind=engine)
	db = SessionLocal()
	try:
		# permissions
		name_to_perm: dict[str, Permission] = {}
		for name in DEFAULT_PERMISSIONS:
			perm = db.execute(select(Permission).where(Permission.name == name)).scalar_one_or_none()
			if not perm:
				perm = Permission(name=name)
				db.add(perm)
			db.flush()
			name_to_perm[name] = perm

		# roles
		for role_name, perm_names in DEFAULT_ROLES.items():
			role = db.execute(select(Role).where(Role.name == role_name)).scalar_one_or_none()
			if not role:
				role = Role(name=role_name)
				db.add(role)
			db.flush()
			role.permissions = [name_to_perm[p] for p in perm_names]

		db.commit()

		# admin user
		admin_email = "admin@example.com"
		admin = db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none()
		if not admin:
			admin = User(email=admin_email, full_name="Admin", password_hash=hash_password("admin12345"))
			admin_role = db.execute(select(Role).where(Role.name == "admin")).scalar_one_or_none()
			if admin_role:
				admin.roles.append(admin_role)
			db.add(admin)
			db.commit()
	finally:
		db.close()


if __name__ == "__main__":
	seed()