import json

from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.database import redis_client
from app.config import settings

security = HTTPBearer()


async def _load_session(user_id: str) -> dict | None:
    session_raw = await redis_client.get(f"session:{user_id}")
    if not session_raw:
        return None
    try:
        return json.loads(session_raw)
    except json.JSONDecodeError:
        return None


async def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        session = await _load_session(user_id)
        if not session or session.get("token") != token:
            raise HTTPException(status_code=401, detail="Session expired or logged out")
        return {
            "user_id": user_id,
            "role": role or "student",
            "email": payload.get("email", ""),
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    return await decode_token(credentials.credentials)


def require_role(*allowed_roles: str):
    async def role_checker(current_user: dict = Depends(get_current_user)):
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


async def verify_ws_token(token: str = Query(...)):
    try:
        return await decode_token(token)
    except HTTPException:
        return None
