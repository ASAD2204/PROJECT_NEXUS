# Auth Service

> **Authentication & Authorization microservice for Project Nexus**

## Overview

The Auth Service handles user registration, login, JWT token management, password recovery (OTP-based), profile management, and admin user administration. It serves as the identity provider for all other microservices in the platform.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **PostgreSQL** | Primary database (SQLAlchemy ORM) |
| **Redis** | Session storage, OTP cache, password reset tokens |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
auth-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py          # Settings & environment variables
    ├── database.py        # PostgreSQL engine + session
    ├── dependencies.py    # JWT auth & role guard dependencies
    ├── main.py            # FastAPI app entrypoint
    ├── models.py          # SQLAlchemy ORM models
    ├── routes.py          # All API route handlers
    └── schemas.py         # Pydantic request/response schemas
```

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | `str` | *required* | PostgreSQL connection string |
| `REDIS_URL` | `str` | `redis://redis:6379` | Redis connection string |
| `KAFKA_BROKER` | `str` | `kafka:9092` | Kafka broker address |
| `JWT_SECRET` | `str` | *required* | Secret key for JWT signing |
| `JWT_ALGORITHM` | `str` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `int` | `60` | Token expiry in minutes |

## Database Models

### `AuthUser` — table `auth_users`
| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | UUID | PK, default uuid4 |
| `email` | String(255) | unique, not null |
| `password_hash` | String(255) | not null |
| `first_name` | String(100) | nullable |
| `last_name` | String(100) | nullable |
| `phone` | String(20) | nullable |
| `is_active` | Boolean | default True |
| `created_at` | TIMESTAMP | server default now() |
| `last_login` | TIMESTAMP | nullable |

### `AuthRole` — table `auth_roles`
| Column | Type | Constraints |
|--------|------|-------------|
| `role_id` | Integer | PK, auto-increment |
| `role_name` | String(50) | unique, not null |
| `description` | Text | nullable |

### `AuthUserRole` — table `auth_user_roles`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, auto-increment |
| `user_id` | UUID | FK → auth_users.user_id (CASCADE) |
| `role_id` | Integer | FK → auth_roles.role_id (CASCADE) |
| `assigned_at` | TIMESTAMP | server default now() |

### `AuthPermission` — table `auth_permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| `perm_id` | Integer | PK, auto-increment |
| `role_id` | Integer | FK → auth_roles.role_id (CASCADE) |
| `resource` | String(50) | — |
| `action_slug` | String(50) | — |

### `AuthApiKey` — table `auth_api_keys`
| Column | Type | Constraints |
|--------|------|-------------|
| `key_id` | Integer | PK, auto-increment |
| `user_id` | UUID | FK → auth_users.user_id (CASCADE) |
| `service_name` | String(100) | — |
| `api_key_hash` | String(255) | not null |
| `expires_at` | TIMESTAMP | nullable |

## Redis Usage

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `session:{user_id}` | 1 hour | User session JSON (`{user_id, role, permissions, login_time, token}`) |
| `otp:{email}` | 5 minutes (300s) | 6-digit OTP for password recovery |
| `reset:{email}` | 15 minutes | Password reset JWT token |

## API Endpoints

All endpoints are prefixed with `/api/v1/auth`.

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | `POST` | `/register` | No | Register a new user (hashes password with bcrypt, creates user + role, stores session in Redis) |
| 2 | `POST` | `/login` | No | Authenticate via email + password, returns JWT |
| 3 | `POST` | `/logout` | Yes | Deletes Redis session for the current user |
| 4 | `GET` | `/me` | Yes | Get authenticated user's profile |
| 5 | `POST` | `/refresh` | No | Refresh an expired JWT token |
| 6 | `PUT` | `/profile` | Yes | Update user profile (name, phone, email) |
| 7 | `POST` | `/forgot-password` | No | Generate 6-digit OTP, store in Redis (5-min TTL) |
| 8 | `POST` | `/verify-otp` | No | Validate OTP, generate reset token (15-min exp) |
| 9 | `POST` | `/reset-password` | No | Reset password using reset token |
| 10 | `GET` | `/users` | Admin | List all users with roles |
| 11 | `PUT` | `/users/{user_id}/toggle-active` | Admin | Toggle user active/inactive status |
| 12 | `GET` | `/health` | No | Health check |

## Pydantic Schemas

| Schema | Purpose |
|--------|---------|
| `RegisterRequest` | User registration input (email, password, role, optional profile fields) |
| `LoginRequest` | Login input (email, password) |
| `TokenResponse` | JWT response (access_token, token_type, role) |
| `UserResponse` | User profile response |
| `ProfileUpdateRequest` | Profile update input |
| `UserListResponse` | Admin user list item |
| `RefreshRequest` | Token refresh input |
| `ForgotPasswordRequest` | Forgot password input (email) |
| `VerifyOTPRequest` | OTP verification input (email, otp) |
| `ResetPasswordRequest` | Password reset input (reset_token, new_password) |
| `MessageResponse` | Generic message response |

## Authentication & Dependencies

| Dependency | Description |
|------------|-------------|
| `get_current_user` | Extracts and validates JWT from Bearer token header. Returns `{user_id, role, email}`. Raises 401 on invalid token. |
| `require_role(required_role)` | Factory that enforces the user has a specific role. Raises 403 if unauthorized. |

## Docker Configuration

| Property | Value |
|----------|-------|
| Base Image | `python:3.11-slim` |
| Exposed Port | `8000` |
| Healthcheck | `GET /health` (15s interval, 5s timeout, 3 retries) |
| Entrypoint | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

## Dependencies (requirements.txt)

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
redis
```
