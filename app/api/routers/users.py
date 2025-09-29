from __future__ import annotations

import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import Session

from app.api.deps import require_permissions, get_current_user
from app.db.database import get_db
from app.models import Role, User
from app.schemas.user import UserRead, UserUpdate, UserCreate
from app.services.security import hash_password


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


@router.get("/", response_model=List[UserRead], dependencies=[Depends(require_permissions("manage_users"))])
def list_users(
	db: Session = Depends(get_db),
	search: Optional[str] = Query(None, description="Search by email or full name"),
	role: Optional[str] = Query(None, description="Filter by role name"),
	is_active: Optional[bool] = Query(None, description="Filter by active status"),
	limit: int = Query(50, ge=1, le=100, description="Number of users to return"),
	offset: int = Query(0, ge=0, description="Number of users to skip"),
) -> List[UserRead]:
	query = select(User)
	
	# Apply filters
	filters = []
	if search:
		search_filter = or_(
			User.email.ilike(f"%{search}%"),
			User.full_name.ilike(f"%{search}%")
		)
		filters.append(search_filter)
	
	if is_active is not None:
		filters.append(User.is_active == is_active)
	
	if role:
		# Join with roles to filter by role name
		query = query.join(User.roles).where(Role.name == role)
	
	if filters:
		query = query.where(and_(*filters))
	
	# Apply pagination
	query = query.offset(offset).limit(limit)
	
	users = db.execute(query).scalars().all()
	return [user_to_read(u) for u in users]


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(require_permissions("manage_users"))])
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserRead:
	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	return user_to_read(user)


@router.patch("/{user_id}", response_model=UserRead, dependencies=[Depends(require_permissions("manage_users"))])
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)) -> UserRead:
	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	if payload.full_name is not None:
		user.full_name = payload.full_name
	if payload.password is not None:
		user.password_hash = hash_password(payload.password)
	if payload.profile_picture is not None:
		user.profile_picture = payload.profile_picture
	if payload.is_active is not None:
		user.is_active = payload.is_active
	db.add(user)
	db.commit()
	db.refresh(user)
	return user_to_read(user)


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permissions("manage_users"))])
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
	# Check if email already exists
	existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
	if existing:
		raise HTTPException(status_code=400, detail="Email already registered")
	
	user = User(
		email=payload.email,
		full_name=payload.full_name,
		password_hash=hash_password(payload.password),
	)
	db.add(user)
	db.commit()
	db.refresh(user)
	return user_to_read(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions("manage_users"))])
def delete_user(user_id: int, db: Session = Depends(get_db)):
	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	db.delete(user)
	db.commit()


@router.post("/{user_id}/roles", response_model=UserRead, dependencies=[Depends(require_permissions("manage_users"))])
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


@router.post("/upload-profile-picture", response_model=UserRead)
async def upload_profile_picture(
	file: UploadFile = File(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
) -> UserRead:
	"""Upload profile picture for the current user"""
	
	# Validate file type
	if not file.content_type or not file.content_type.startswith('image/'):
		raise HTTPException(status_code=400, detail="File must be an image")
	
	# Validate file size using settings
	from app.core.config import get_settings
	settings = get_settings()
	if file.size and file.size > settings.max_file_size:
		max_mb = settings.max_file_size / (1024 * 1024)
		raise HTTPException(status_code=400, detail=f"File size must be less than {max_mb:.1f}MB")
	
	# Create uploads directory if it doesn't exist
	upload_dir = "uploads/profile_pictures"
	os.makedirs(upload_dir, exist_ok=True)
	
	# Generate unique filename
	file_extension = file.filename.split('.')[-1] if file.filename else 'jpg'
	filename = f"{uuid.uuid4()}.{file_extension}"
	file_path = os.path.join(upload_dir, filename)
	
	# Save file
	try:
		with open(file_path, "wb") as buffer:
			content = await file.read()
			buffer.write(content)
	except Exception as e:
		raise HTTPException(status_code=500, detail="Failed to save file")
	
	# Update user profile picture path
	current_user.profile_picture = f"/uploads/profile_pictures/{filename}"
	db.add(current_user)
	db.commit()
	db.refresh(current_user)
	
	return user_to_read(current_user)


@router.get("/stats/summary", dependencies=[Depends(require_permissions("manage_users"))])
def get_user_stats(db: Session = Depends(get_db)):
	"""Get user statistics summary"""
	total_users = db.execute(select(User)).scalars().all()
	active_users = [u for u in total_users if u.is_active]
	
	# Count by roles
	role_counts = {}
	for user in total_users:
		for role in user.roles:
			role_counts[role.name] = role_counts.get(role.name, 0) + 1
	
	return {
		"total_users": len(total_users),
		"active_users": len(active_users),
		"inactive_users": len(total_users) - len(active_users),
		"role_distribution": role_counts,
	}