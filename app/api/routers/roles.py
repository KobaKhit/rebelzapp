from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permissions
from app.db.database import get_db
from app.models import Permission, Role
from app.schemas.role import RoleCreate, RoleRead, RoleUpdate


router = APIRouter(dependencies=[Depends(require_permissions("manage_roles"))])


def role_to_read(role: Role) -> RoleRead:
	return RoleRead(id=role.id, name=role.name, description=role.description, permissions=[p.name for p in role.permissions])


@router.post("/", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, db: Session = Depends(get_db)) -> RoleRead:
	existing = db.execute(select(Role).where(Role.name == payload.name)).scalar_one_or_none()
	if existing:
		raise HTTPException(status_code=400, detail="Role already exists")
	role = Role(name=payload.name, description=payload.description)
	db.add(role)
	db.commit()
	db.refresh(role)
	return role_to_read(role)


@router.get("/", response_model=List[RoleRead])
def list_roles(db: Session = Depends(get_db)) -> List[RoleRead]:
	roles = db.execute(select(Role)).scalars().all()
	return [role_to_read(r) for r in roles]


@router.get("/{role_id}", response_model=RoleRead)
def get_role(role_id: int, db: Session = Depends(get_db)) -> RoleRead:
	role = db.get(Role, role_id)
	if not role:
		raise HTTPException(status_code=404, detail="Role not found")
	return role_to_read(role)


@router.patch("/{role_id}", response_model=RoleRead)
def update_role(role_id: int, payload: RoleUpdate, db: Session = Depends(get_db)) -> RoleRead:
	role = db.get(Role, role_id)
	if not role:
		raise HTTPException(status_code=404, detail="Role not found")
	if payload.description is not None:
		role.description = payload.description
	db.add(role)
	db.commit()
	db.refresh(role)
	return role_to_read(role)


@router.post("/{role_id}/permissions", response_model=RoleRead)
def set_role_permissions(role_id: int, permissions: List[str], db: Session = Depends(get_db)) -> RoleRead:
	role = db.get(Role, role_id)
	if not role:
		raise HTTPException(status_code=404, detail="Role not found")
	perm_objs = db.execute(select(Permission).where(Permission.name.in_(permissions))).scalars().all()
	role.permissions = perm_objs
	db.add(role)
	db.commit()
	db.refresh(role)
	return role_to_read(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(role_id: int, db: Session = Depends(get_db)):
	role = db.get(Role, role_id)
	if not role:
		raise HTTPException(status_code=404, detail="Role not found")
	db.delete(role)
	db.commit()