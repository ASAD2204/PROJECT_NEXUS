import json

import asyncpg
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.database import redis_client

security = HTTPBearer()
_auth_pool: asyncpg.Pool | None = None


async def _get_auth_pool() -> asyncpg.Pool:
    global _auth_pool
    if _auth_pool is None:
        _auth_pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=2,
            max_size=5,
        )
    return _auth_pool


async def _load_session(user_id: str) -> dict | None:
    session_raw = await redis_client.get(f"session:{user_id}")
    if not session_raw:
        return None
    try:
        return json.loads(session_raw)
    except json.JSONDecodeError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Decode the JWT token, then verify the Redis session and account status.

    Returns a dict with at least ``user_id``, ``role``, and ``email``.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub") or payload.get("user_id")
        role: str | None = payload.get("role")
        email: str | None = payload.get("email")

        if user_id is None:
            raise credentials_exception

        session = await _load_session(user_id)
        if not session or session.get("token") != token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or logged out",
            )

        pool = await _get_auth_pool()
        row = await pool.fetchrow(
            """
            SELECT u.email, u.is_active, r.role_name
            FROM auth_users u
            LEFT JOIN auth_user_roles ur ON ur.user_id = u.user_id
            LEFT JOIN auth_roles r ON r.role_id = ur.role_id
            WHERE u.user_id = $1
            """,
            user_id,
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        if not row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        return {
            "user_id": user_id,
            "role": row["role_name"] or role or "student",
            "email": row["email"] or email or "",
        }
    except JWTError:
        raise credentials_exception
