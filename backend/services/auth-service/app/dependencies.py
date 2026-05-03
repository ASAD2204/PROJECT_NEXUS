import json

import redis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AuthRole, AuthUser, AuthUserRole

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
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

    session = _load_session(user_id)
    if not session or session.get("token") != token:
        raise HTTPException(status_code=401, detail="Session expired or logged out")

    user = db.query(AuthUser).filter(AuthUser.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user_role = db.query(AuthUserRole).filter(AuthUserRole.user_id == user.user_id).first()
    if user_role:
        role_row = db.query(AuthRole).filter(AuthRole.role_id == user_role.role_id).first()
        role = role_row.role_name if role_row else role

    return {"user_id": user_id, "role": role, "email": user.email}


def require_role(required_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker
