# HR Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> Human resources module — leave management (casual leave quota system), employee profile management with encrypted salary tiers, and Redis-backed session validation on protected requests.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.11) |
| PostgreSQL | SQLAlchemy ORM — leaves, faculty profiles |
| Redis | Session validation for protected requests |
| Encryption | Fernet (AES-256) — salary tier encryption |
| Auth | JWT Bearer (`python-jose`) |
| Container | Docker (Python 3.11-slim, port 8000) |

---

## File Structure

```
hr-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py          # Pydantic Settings — env vars
    ├── database.py        # SQLAlchemy engine, session factory, get_db
    ├── dependencies.py    # get_current_user, require_role (JWT + Redis session)
    ├── main.py            # FastAPI app, CORS, auto-migration on startup
    ├── models.py          # 3 PostgreSQL ORM models
    ├── schemas.py         # 7 Pydantic request/response schemas
    └── routes.py          # All API endpoints + Fernet encryption helpers
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | No | `60` | JWT expiry (declared, not used — validates only) |
| `AES_SECRET_KEY` | No | `""` | Fernet key for salary tier encryption |
| `REDIS_URL` | No | `redis://redis:6379` | Redis connection used for auth session validation |
| `KAFKA_BROKER` | No | `kafka:9092` | Declared but unused |

---

## PostgreSQL Models

### `ops_leaves`

| Column | Type | Constraints |
|--------|------|-------------|
| `leave_id` | Integer | **PK**, autoincrement |
| `user_id` | UUID | NOT NULL |
| `leave_type` | String(50) | — |
| `start_date` | Date | NOT NULL |
| `end_date` | Date | NOT NULL |
| `reason` | Text | — |
| `status` | String(20) | default `"Pending"` |

### `ops_leave_documents`

| Column | Type | Constraints |
|--------|------|-------------|
| `document_id` | Integer | **PK**, autoincrement |
| `leave_id` | Integer | FK → ops_leaves.leave_id |
| `document_url` | Text | NOT NULL |

### `hr_notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| `notification_id` | Integer | **PK**, autoincrement |
| `user_id` | UUID | NOT NULL |
| `title` | String(200) | NOT NULL |
| `message` | Text | NOT NULL |
| `is_read` | Boolean | default `False` |

### `sis_faculty` (shared mirror — `extend_existing=True`)
...

## API Endpoints (11 total)

All routes prefixed `/api/v1/hr`.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Returns status info |

### Leave Management (5 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/leaves/apply` | Any user | Apply for leave with docs; validates casual quota |
| GET | `/leaves/me` | Any user | Get own leaves + balance stats |
| GET | `/leaves/pending` | hod, admin | List all pending leave requests |
| PUT | `/leaves/{leave_id}/approve` | hod, admin | Approve leave (marks attendance + notifies) |
| PUT | `/leaves/{leave_id}/reject` | hod, admin | Reject a leave with reason |

### Employee Management (3 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/employees` | admin | List all employees with emails |
| GET | `/employees/{faculty_id}` | Any user | Get single employee profile |
| PUT | `/employees/{faculty_id}` | admin | Update profile & salary (encrypted) |

### Notifications (2 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications/me` | Any user | Get HR-related notifications |
| PUT | `/notifications/{notification_id}/read` | Any user | Mark notification as read |

---

## Pydantic Schemas (7 total)

| Schema | Type | Key Fields |
|--------|------|------------|
| `LeaveApplyRequest` | Request | `leave_type`, `start_date`, `end_date`, `reason` |
| `LeaveOut` | Response | `leave_id`, `user_id`, `leave_type`, `start_date`, `end_date`, `reason?`, `status` |
| `LeaveActionRequest` | Request | `reason?` (optional rejection reason) |
| `LeaveBalanceOut` | Response | `casual_leave_total` (20), `casual_leave_used`, `casual_leave_remaining` |
| `EmployeeOut` | Response | `faculty_id`, `user_id`, `dept_id`, `employee_code`, `designation`, `profile_image_id`, `email` |
| `EmployeeUpdate` | Request | `designation?`, `dept_id?`, `salary_tier?` |
| `MessageResponse` | Response | `message` |

---

## Special Logic

### Salary Tier Encryption (Fernet / AES-256)

- `_get_fernet()` — takes `AES_SECRET_KEY`, pads/truncates to 32 bytes, base64-url-safe encodes to build a Fernet key
- `_encrypt_salary(salary)` — encrypts plaintext salary tier string before writing to `salary_tier_encrypted`
- `_decrypt_salary(encrypted)` — decrypts; silently returns raw value on failure
- Encryption is applied **only on write** (`update_employee`). The `EmployeeOut` schema deliberately **omits** the salary tier field — it is never exposed via the API.

### Casual Leave Quota System

| Constant | Value |
|----------|-------|
| `CASUAL_LEAVE_QUOTA` | **20 days per year** |

- `_get_casual_leave_used()` — counts `OpsLeave` records of type `"Casual"` with status `"Approved"` in the current calendar year using `extract("year", ...)`
- `apply_leave` blocks new casual leave applications when the annual quota is exhausted
- `my_leaves` returns both the leave list and a `LeaveBalanceOut` with used/remaining counts

### Leave Rejection Reason

When a leave is rejected, the admin/HOD-supplied reason is **appended** to the original reason field as:
```
\n[Rejection reason: <reason>]
```

### Role-Based Access Control

| Operation | Allowed Roles |
|-----------|---------------|
| Leave approval/rejection | `hod`, `admin` |
| Employee list/update | `admin` only |
| Employee detail view | Any authenticated user |
| Leave apply/view | Any authenticated user |

### Cross-Service Table Sharing

- `sis_faculty` and `auth_users` use `extend_existing=True` — shares the same PostgreSQL tables as SIS and Auth services without conflicting ORM metadata
- `list_employees` joins `sis_faculty` with `auth_users` to include email addresses

---

## Docker Configuration

| Setting | Value |
|---------|-------|
| Base Image | `python:3.11-slim` |
| Port | 8000 |
| Healthcheck | `GET /health` every 15s, 5s timeout, 3 retries, 20s start |
| CMD | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn[standard]` | ASGI server |
| `sqlalchemy` | PostgreSQL ORM |
| `psycopg2-binary` | PostgreSQL driver |
| `pydantic-settings` | Settings management |
| `python-jose[cryptography]` | JWT verification |
| `cryptography` | Fernet symmetric encryption for salary tiers |

---

## Cross-Service Dependencies

| Dependency | Direction | Description |
|-----------|-----------|-------------|
| `sis_faculty` | Read/Write (PostgreSQL) | Shared faculty table with SIS service |
| `auth_users` | Read (PostgreSQL) | Reads email from auth service table |
