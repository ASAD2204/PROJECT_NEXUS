import json

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, redis_client
from app.models import AuthUser

security = HTTPBearer()


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
    """Decode the JWT token, then verify the Redis session and account status."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    session = _load_session(user_id)
    if not session or session.get("token") != token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or logged out",
        )

    user = db.query(AuthUser).filter(AuthUser.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return {
        "user_id": user_id,
        "role": payload.get("role", "student"),
        "email": user.email,
    }


def require_role(*allowed_roles: str):
    """Return a dependency that enforces one or more allowed roles."""

    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user['role']}' is not authorized. "
                       f"Required: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker
