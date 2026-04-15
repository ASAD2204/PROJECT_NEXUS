from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate the current user from a Bearer token."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return {
            "user_id": user_id,
            "role": role,
            "email": payload.get("email"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token",
        )


def verify_ws_token(token: str = Query(...)):
    """Verify a JWT token passed as a query parameter for WebSocket connections.

    Returns the user dict on success, or None when the token is invalid so the
    caller can close the socket gracefully instead of raising an HTTP error.
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return {
            "user_id": user_id,
            "role": payload.get("role"),
            "email": payload.get("email"),
        }
    except JWTError:
        return None
