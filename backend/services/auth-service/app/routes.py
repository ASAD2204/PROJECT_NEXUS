import json
import random
import string
from datetime import datetime, timedelta

import redis
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import AuthUser, AuthRole, AuthUserRole
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    RefreshRequest,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
    MessageResponse,
    ProfileUpdateRequest,
    UserListResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60


def _session_ttl_seconds() -> int:
    return max(60, int(settings.JWT_EXPIRE_MINUTES) * 60)


def _login_attempts_key(email: str) -> str:
    return f"auth:login_attempts:{email.lower()}"


def _login_lock_key(email: str) -> str:
    return f"auth:login_lock:{email.lower()}"


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(AuthUser).filter(AuthUser.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed = pwd_context.hash(payload.password)

    # Create user
    user = AuthUser(
        email=payload.email,
        password_hash=hashed,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
    )
    db.add(user)
    db.flush()

    # Get role
    role = db.query(AuthRole).filter(AuthRole.role_name == payload.role).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    # Assign role
    user_role = AuthUserRole(user_id=user.user_id, role_id=role.role_id)
    db.add(user_role)

    # For student role: create sis_students record when complete profile fields are present
    if payload.role == "student" and payload.roll_no and payload.program_id is not None:
        from sqlalchemy import text
        db.execute(
            text(
                "INSERT INTO sis_students (user_id, roll_no, program_id) VALUES (:uid, :roll, :pid)"
            ),
            {"uid": str(user.user_id), "roll": payload.roll_no, "pid": payload.program_id},
        )

    # For faculty role: create sis_faculty record when complete profile fields are present
    if (
        payload.role == "faculty"
        and payload.employee_code
        and payload.dept_id is not None
    ):
        from sqlalchemy import text
        db.execute(
            text(
                "INSERT INTO sis_faculty (user_id, employee_code, dept_id, designation) "
                "VALUES (:uid, :ecode, :did, :desig)"
            ),
            {
                "uid": str(user.user_id),
                "ecode": payload.employee_code,
                "did": payload.dept_id,
                "desig": payload.designation,
            },
        )

    db.commit()

    # Create JWT
    token = create_access_token(
        {"sub": str(user.user_id), "role": payload.role, "email": user.email}
    )

    # Store session in Redis (FYP Table 143 — JSON structure, 1h TTL)
    session_data = json.dumps({
        "user_id": str(user.user_id),
        "role": payload.role,
        "permissions": [],
        "login_time": datetime.utcnow().isoformat(),
        "token": token,
    })
    redis_client.setex(f"session:{user.user_id}", _session_ttl_seconds(), session_data)

    return TokenResponse(access_token=token, role=payload.role)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    lock_key = _login_lock_key(payload.email)
    attempts_key = _login_attempts_key(payload.email)

    if redis_client.get(lock_key):
        raise HTTPException(
            status_code=423,
            detail="Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes.",
        )

    # Query user
    user = db.query(AuthUser).filter(AuthUser.email == payload.email).first()
    if not user or not pwd_context.verify(payload.password, user.password_hash):
        attempts = redis_client.incr(attempts_key)
        redis_client.expire(attempts_key, LOCKOUT_SECONDS)
        if attempts >= MAX_LOGIN_ATTEMPTS:
            redis_client.setex(lock_key, LOCKOUT_SECONDS, "1")
            redis_client.delete(attempts_key)
            raise HTTPException(
                status_code=423,
                detail="Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes.",
            )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Get role
    user_role = db.query(AuthUserRole).filter(AuthUserRole.user_id == user.user_id).first()
    if not user_role:
        raise HTTPException(status_code=500, detail="No role assigned to user")

    role = db.query(AuthRole).filter(AuthRole.role_id == user_role.role_id).first()
    role_name = role.role_name

    # Create JWT
    token = create_access_token(
        {"sub": str(user.user_id), "role": role_name, "email": user.email}
    )

    # Clear failed-attempt tracking after successful login
    redis_client.delete(attempts_key)
    redis_client.delete(lock_key)

    # Store session in Redis (FYP Table 143 — JSON structure, 1h TTL)
    session_data = json.dumps({
        "user_id": str(user.user_id),
        "role": role_name,
        "permissions": [],
        "login_time": datetime.utcnow().isoformat(),
        "token": token,
    })
    redis_client.setex(f"session:{user.user_id}", _session_ttl_seconds(), session_data)

    # Update last_login
    user.last_login = datetime.utcnow()
    db.commit()

    return TokenResponse(access_token=token, role=role_name)


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: dict = Depends(get_current_user)):
    redis_client.delete(f"session:{current_user['user_id']}")
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(AuthUser).filter(AuthUser.user_id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        is_active=user.is_active,
        role=current_user["role"],
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest):
    try:
        decoded = jwt.decode(
            payload.access_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}
        )
        user_id = decoded.get("sub")
        role = decoded.get("role")
        email = decoded.get("email")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        new_token = create_access_token({"sub": user_id, "role": role, "email": email})
        # Refresh session in Redis (FYP Table 143)
        session_data = json.dumps({
            "user_id": user_id,
            "role": role,
            "permissions": [],
            "login_time": datetime.utcnow().isoformat(),
            "token": new_token,
        })
        redis_client.setex(f"session:{user_id}", _session_ttl_seconds(), session_data)
        return TokenResponse(access_token=new_token, role=role)
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(AuthUser).filter(AuthUser.email == payload.email).first()
    if not user:
        # Don't reveal if email exists
        return MessageResponse(message="If the email exists, an OTP has been sent")

    # Generate 6-digit OTP
    otp = "".join(random.choices(string.digits, k=6))

    # Store OTP in Redis (FYP Table 149 — 5-minute TTL)
    redis_client.setex(f"otp:{payload.email}", 300, otp)

    # In production, send OTP via email. For now, log it.
    print(f"OTP for {payload.email}: {otp}")

    return MessageResponse(message="If the email exists, an OTP has been sent")


@router.post("/verify-otp")
def verify_otp(payload: VerifyOTPRequest):
    stored_otp = redis_client.get(f"otp:{payload.email}")
    if not stored_otp or stored_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Generate reset token
    reset_token = create_access_token(
        {"sub": payload.email, "purpose": "reset"},
        expires_delta=timedelta(minutes=15),
    )
    redis_client.delete(f"otp:{payload.email}")
    redis_client.setex(f"reset:{payload.email}", 900, reset_token)

    return {"reset_token": reset_token}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        decoded = jwt.decode(
            payload.reset_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        email = decoded.get("sub")
        purpose = decoded.get("purpose")
        if purpose != "reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")

        # Verify token is still in Redis
        stored = redis_client.get(f"reset:{email}")
        if not stored:
            raise HTTPException(status_code=400, detail="Reset token expired")

        user = db.query(AuthUser).filter(AuthUser.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.password_hash = pwd_context.hash(payload.new_password)
        db.commit()

        redis_client.delete(f"reset:{email}")

        return MessageResponse(message="Password reset successfully")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid reset token")


# ---------------------------------------------------------------------------
# Profile update
# ---------------------------------------------------------------------------


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile."""
    user = db.query(AuthUser).filter(AuthUser.user_id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        is_active=user.is_active,
        role=current_user["role"],
    )


# ---------------------------------------------------------------------------
# Admin: user management
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[UserListResponse])
def list_users(
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all users."""
    users = db.query(AuthUser).order_by(AuthUser.created_at.desc()).all()
    result = []
    for u in users:
        user_role = db.query(AuthUserRole).filter(AuthUserRole.user_id == u.user_id).first()
        role_name = ""
        if user_role:
            role = db.query(AuthRole).filter(AuthRole.role_id == user_role.role_id).first()
            role_name = role.role_name if role else ""
        result.append(
            UserListResponse(
                user_id=u.user_id,
                email=u.email,
                first_name=u.first_name,
                last_name=u.last_name,
                phone=u.phone,
                is_active=u.is_active,
                role=role_name,
                created_at=str(u.created_at) if u.created_at else None,
            )
        )
    return result


@router.put("/users/{user_id}/toggle-active", response_model=MessageResponse)
def toggle_user_active(
    user_id: str,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint to activate/deactivate a user."""
    user = db.query(AuthUser).filter(AuthUser.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.commit()
    status_text = "activated" if user.is_active else "deactivated"
    return MessageResponse(message=f"User {status_text} successfully")
