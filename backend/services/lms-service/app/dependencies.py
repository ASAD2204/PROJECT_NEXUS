from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import redis
import json
from app.config import settings
from app.database import get_db

redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    """Decode the JWT token and return the current user payload."""
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
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Optional Session Check (for Cloud Readiness / Session Termination)
        if settings.JWT_SESSION_CHECK:
            session_raw = redis_client.get(f"session:{user_id}")
            if not session_raw:
                raise HTTPException(status_code=401, detail="Session expired or logged out")
            session = json.loads(session_raw)
            if session.get("token") != token:
                raise HTTPException(status_code=401, detail="Session token mismatch")

        return {
            "user_id": str(user_id),
            "role": payload.get("role", "student"),
            "email": payload.get("email"),
        }
    except JWTError:
        raise credentials_exception
    except Exception as exc:
        if isinstance(exc, HTTPException): raise exc
        raise credentials_exception


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
