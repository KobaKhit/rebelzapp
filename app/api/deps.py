from __future__ import annotations

from typing import Callable, Iterable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Permission, Role, User
from app.services.security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
	try:
		payload = decode_access_token(token)
		sub = payload.get("sub")
		if sub is None:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
	except JWTError:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

	user = db.get(User, int(sub))
	if user is None or not user.is_active:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or missing user")
	return user


def require_roles(*role_names: str) -> Callable[[User], User]:
	async def _dependency(user: User = Depends(get_current_user)) -> User:
		user_role_names = {r.name for r in user.roles}
		if not set(role_names).issubset(user_role_names):
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
		return user
	return _dependency


def require_permissions(*permission_names: str) -> Callable[[User], User]:
	async def _dependency(user: User = Depends(get_current_user)) -> User:
		user_permissions = {p.name for r in user.roles for p in r.permissions}
		if not set(permission_names).issubset(user_permissions):
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
		return user
	return _dependency