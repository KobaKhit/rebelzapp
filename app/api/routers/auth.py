from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import Role, User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserRead
from app.services.security import create_access_token, verify_password, hash_password


router = APIRouter()


def user_to_read(user: User) -> UserRead:
	return UserRead(
		id=user.id,
		email=user.email,
		full_name=user.full_name,
		profile_picture=user.profile_picture,
		is_active=user.is_active,
		roles=[r.name for r in user.roles],
	)


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
	existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
	if existing:
		raise HTTPException(status_code=400, detail="Email already registered")

	user = User(
		email=payload.email,
		full_name=payload.full_name,
		password_hash=hash_password(payload.password),
	)
	# default role if exists
	student_role = db.execute(select(Role).where(Role.name == "student")).scalar_one_or_none()
	if student_role:
		user.roles.append(student_role)

	db.add(user)
	db.commit()
	db.refresh(user)
	return user_to_read(user)


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
	user = db.execute(select(User).where(User.email == form_data.username)).scalar_one_or_none()
	if not user or not verify_password(form_data.password, user.password_hash):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
	token = create_access_token(subject=str(user.id))
	return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)) -> UserRead:
	return user_to_read(current_user)