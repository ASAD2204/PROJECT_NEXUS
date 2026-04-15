from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

security = HTTPBearer()


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "user_id": user_id,
            "role": role or "student",
            "email": payload.get("email", ""),
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    return decode_token(credentials.credentials)


def require_role(*allowed_roles: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return role_checker


def require_internal_api_key(x_internal_api_key: str = Header(default="", alias="X-Internal-Api-Key")) -> str:
    expected = settings.INTERNAL_API_KEY
    if not expected:
        raise HTTPException(status_code=503, detail="Internal API key is not configured")
    if x_internal_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid internal API key")
    return x_internal_api_key
