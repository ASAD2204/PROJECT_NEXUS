from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Decode and validate the JWT token.

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

        return {
            "user_id": user_id,
            "role": role or "student",
            "email": email or "",
        }
    except JWTError:
        raise credentials_exception
