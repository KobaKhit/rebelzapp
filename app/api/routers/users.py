from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permissions
from app.db.database import get_db
from app.models import Role, User
from app.schemas.user import UserRead, UserUpdate
from app.services.security import hash_password


router = APIRouter(dependencies=[Depends(require_permissions("manage_users"))])


def user_to_read(user: User) -> UserRead:
	return UserRead(
		id=user.id,
		email=user.email,
		full_name=user.full_name,
		is_active=user.is_active,
		roles=[r.name for r in user.roles],
	)


@router.get("/", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db)) -> List[UserRead]:
	users = db.execute(select(User)).scalars().all()
	return [user_to_read(u) for u in users]


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserRead:
	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	return user_to_read(user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)) -> UserRead:
	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	if payload.full_name is not None:
		user.full_name = payload.full_name
	if payload.password is not None:
		user.password_hash = hash_password(payload.password)
	if payload.is_active is not None:
		user.is_active = payload.is_active
	db.add(user)
	db.commit()
	db.refresh(user)
	return user_to_read(user)


@router.post("/{user_id}/roles", response_model=UserRead)
def set_user_roles(user_id: int, roles: List[str], db: Session = Depends(get_db)) -> UserRead:
	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	role_objs = db.execute(select(Role).where(Role.name.in_(roles))).scalars().all()
	user.roles = role_objs
	db.add(user)
	db.commit()
	db.refresh(user)
	return user_to_read(user)