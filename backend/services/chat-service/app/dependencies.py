from fastapi import Depends, HTTPException, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings

security = HTTPBearer(auto_error=False)


def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate the current user from a Bearer token or Internal Secret."""
    
    # Allow internal service-to-service calls
    internal_secret = request.headers.get("X-Internal-Secret")
    if internal_secret == settings.JWT_SECRET:
        return {
            "user_id": request.headers.get("X-User-Id", "system"),
            "role": request.headers.get("X-User-Role", "admin"),
            "email": "system@nexus.edu",
        }

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
        )

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
            "token": token,
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
