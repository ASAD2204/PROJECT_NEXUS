import json

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, redis_client

security = HTTPBearer()


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
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

    session = await _load_session(user_id)
    if not session or session.get("token") != token:
        raise HTTPException(status_code=401, detail="Session expired or logged out")

    row = db.execute(
        text(
            """
            SELECT u.email, u.is_active, r.role_name
            FROM auth_users u
            LEFT JOIN auth_user_roles ur ON ur.user_id = u.user_id
            LEFT JOIN auth_roles r ON r.role_id = ur.role_id
            WHERE u.user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    if not row["is_active"]:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return {
        "user_id": user_id,
        "role": row["role_name"] or role or "student",
        "email": row["email"] or payload.get("email", ""),
        "token": token,
    }


def require_role(*allowed_roles: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker
