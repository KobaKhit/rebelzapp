from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings


settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
	return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_delta_minutes: Optional[int] = None, extra_claims: Optional[Dict[str, Any]] = None) -> str:
	expire_minutes = expires_delta_minutes or settings.access_token_expire_minutes
	expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
	to_encode: Dict[str, Any] = {"sub": subject, "exp": expire}
	if extra_claims:
		to_encode.update(extra_claims)
	encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
	return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
	payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
	return payload


def try_decode_access_token(token: str) -> Optional[Dict[str, Any]]:
	try:
		return decode_access_token(token)
	except JWTError:
		return None