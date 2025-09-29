"""Permission utilities for role-based access control."""

from typing import List
from app.models.user import User


def has_role(user: User, role_name: str) -> bool:
    """Check if user has a specific role."""
    return any(role.name == role_name for role in user.roles)


def has_any_role(user: User, role_names: List[str]) -> bool:
    """Check if user has any of the specified roles."""
    user_role_names = {role.name for role in user.roles}
    return bool(user_role_names.intersection(role_names))


def is_admin(user: User) -> bool:
    """Check if user is an admin."""
    return has_role(user, "admin")


def is_instructor(user: User) -> bool:
    """Check if user is an instructor."""
    return has_role(user, "instructor")


def is_admin_or_instructor(user: User) -> bool:
    """Check if user is an admin or instructor."""
    return has_any_role(user, ["admin", "instructor"])


def can_manage_groups(user: User) -> bool:
    """Check if user can manage chat groups (admin or instructor)."""
    return is_admin_or_instructor(user)


def can_create_managed_groups(user: User) -> bool:
    """Check if user can create admin/instructor managed groups."""
    return is_admin_or_instructor(user)


def can_assign_users_to_groups(user: User) -> bool:
    """Check if user can assign users to groups."""
    return is_admin_or_instructor(user)
