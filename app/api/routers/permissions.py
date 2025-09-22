from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permissions
from app.db.database import get_db
from app.models import Permission
from app.schemas.permission import PermissionCreate, PermissionRead, PermissionUpdate


router = APIRouter(dependencies=[Depends(require_permissions("manage_permissions"))])


@router.post("/", response_model=PermissionRead, status_code=status.HTTP_201_CREATED)
def create_permission(payload: PermissionCreate, db: Session = Depends(get_db)) -> PermissionRead:
	existing = db.execute(select(Permission).where(Permission.name == payload.name)).scalar_one_or_none()
	if existing:
		raise HTTPException(status_code=400, detail="Permission already exists")
	perm = Permission(name=payload.name, description=payload.description)
	db.add(perm)
	db.commit()
	db.refresh(perm)
	return PermissionRead.model_validate(perm)


@router.get("/", response_model=List[PermissionRead])
def list_permissions(db: Session = Depends(get_db)) -> List[PermissionRead]:
	perms = db.execute(select(Permission)).scalars().all()
	return [PermissionRead.model_validate(p) for p in perms]


@router.patch("/{permission_id}", response_model=PermissionRead)
def update_permission(permission_id: int, payload: PermissionUpdate, db: Session = Depends(get_db)) -> PermissionRead:
	perm = db.get(Permission, permission_id)
	if not perm:
		raise HTTPException(status_code=404, detail="Permission not found")
	if payload.description is not None:
		perm.description = payload.description
	db.add(perm)
	db.commit()
	db.refresh(perm)
	return PermissionRead.model_validate(perm)


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(permission_id: int, db: Session = Depends(get_db)):
	perm = db.get(Permission, permission_id)
	if not perm:
		raise HTTPException(status_code=404, detail="Permission not found")
	db.delete(perm)
	db.commit()