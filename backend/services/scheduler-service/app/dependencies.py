import json

import redis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

security = HTTPBearer()
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def _load_session(user_id: str) -> dict | None:
    session_raw = redis_client.get(f"session:{user_id}")
    if not session_raw:
        return None
    try:
        return json.loads(session_raw)
    except json.JSONDecodeError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    """Decode and validate the JWT token, then verify the Redis session and account status."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if user_id is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject or role",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    session = _load_session(user_id)
    if not session or session.get("token") != token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or logged out",
        )

    row = db.execute(
        text(
            """
            SELECT u.email, u.is_active, r.role_name
            FROM auth_users u
            LEFT JOIN auth_user_roles ur ON ur.user_id = u.user_id
            LEFT JOIN auth_roles r ON r.role_id = ur.role_id
            WHERE u.user_id = CAST(:user_id AS uuid)
            """
        ),
        {"user_id": user_id},
    ).mappings().first()

    if not row:
        print(f"DEBUG: User {user_id} not found in Scheduler DB mirror")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User record not found in service database",
        )
    if not row["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return {
        "user_id": user_id,
        "role": row["role_name"] or role,
        "email": row["email"] or payload.get("email", ""),
        "name": payload.get("name"),
    }


def require_role(*allowed_roles: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return role_checker
