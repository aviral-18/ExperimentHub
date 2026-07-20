"""Security primitives: password hashing and JWT access tokens.

We use ``pbkdf2_sha256`` (pure-python, no native bcrypt build required) so the
project installs cleanly on any platform, and PyJWT for signed access tokens.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str | int, extra: dict[str, Any] | None = None) -> str:
    """Create a signed JWT whose ``sub`` claim is the user id."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {"sub": str(subject), "exp": expire, "iat": datetime.now(timezone.utc)}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode/verify a JWT. Raises ``jwt.PyJWTError`` on invalid/expired tokens."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
