<!-- touched-for-commit: backend operations doc -->
# Operations Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> Campus operations hub — grievances (NLP-routed), announcements, audit trails, notifications, media assets, system logs, and feature flags.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.11) |
| PostgreSQL | SQLAlchemy ORM — grievances & comments |
| MongoDB | Motor (async) — announcements, audit trails, media assets, notifications, system logs |
| Redis | `redis.asyncio` — notification queue, feature flags, and auth session validation |
| NLP | Google Gemini (`gemini-pro`) + keyword fallback — grievance routing |
| Auth | JWT Bearer (`python-jose`) |
| Container | Docker (Python 3.11-slim, port 8000) |

---

## File Structure

```
operations-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py          # Pydantic Settings — env vars
    ├── database.py        # SQLAlchemy engine, Motor client, Redis async client
    ├── dependencies.py    # get_current_user, require_role (JWT + Redis session)
    ├── main.py            # FastAPI app, CORS, MongoDB index creation on startup
    ├── models.py          # PostgreSQL ORM models
    ├── schemas.py         # Pydantic request/response schemas
    ├── nlp_router.py      # Keyword + Gemini AI grievance routing
    └── routes.py          # All API endpoints (26 total)
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `MONGO_URL` | No | `mongodb://mongodb:27017/nexus_ops` | MongoDB connection (database: `nexus_ops`) |
| `REDIS_URL` | No | `redis://redis:6379` | Redis connection (async, including auth session validation) |
| `GEMINI_API_KEY` | No | `""` | Google Gemini API key for AI grievance routing |
| `JWT_SECRET` | **Yes** | — | JWT signing secret |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | No | `60` | JWT expiry (declared, not used — this service validates only) |
| `KAFKA_BROKER` | No | `kafka:9092` | Reserved for future use |

---

## PostgreSQL Models

### `ops_grievances`

| Column | Type | Constraints |
|--------|------|-------------|
| `ticket_id` | Integer | **PK**, autoincrement |
| `student_id` | Integer | FK → `sis_students.student_id` |
| `category` | String(50) | — |
| `subject` | String(200) | nullable |
| `description` | Text | — |
| `status` | String(20) | default `"Open"` |
| `priority` | String(20) | default `"Normal"` |
| `is_urgent` | Boolean | default `False` |
| `assigned_department` | String(100) | nullable |
| `resolution` | Text | nullable |
| `satisfaction_rating` | Integer | nullable |
| `created_at` | TIMESTAMP | server_default `now()` |
| `updated_at` | TIMESTAMP | server_default `now()`, onupdate |

### `ops_grievance_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| `comment_id` | Integer | **PK**, autoincrement |
| `ticket_id` | Integer | FK → `ops_grievances.ticket_id`, CASCADE |
| `author_id` | UUID | NOT NULL |
| `author_role` | String(50) | — |
| `text` | Text | NOT NULL |
| `created_at` | TIMESTAMP | server_default `now()` |

### `sis_students` (read-only mirror)

| Column | Type | Constraints |
|--------|------|-------------|
| `student_id` | Integer | **PK** |
| `user_id` | UUID | — |
| `roll_no` | String(20) | — |

---

## MongoDB Collections (Database: `nexus_ops`)

All indexes are created at startup in `main.py`.

### `content_announcements` (FYP Table 140)

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Announcement title |
| `content` | string | Full content body |
| `author_id` | string | Creator's user ID |
| `target_audience` | array | Audience roles (e.g., `["student", "faculty", "all"]`) |
| `target_programs` | array | Optional program filter |
| `target_semesters` | array | Optional semester filter |
| `priority` | string | `low` / `medium` / `high` |
| `published_at` | datetime | Publication timestamp |
| `expires_at` | datetime | Optional expiry |
| `is_pinned` | boolean | Pinned to top |
| `attachments` | array | File references |
| `view_count` | integer | Incremented on each view |

**Indexes:** `author_id`, `published_at`, `expires_at`, `is_pinned`, `target_audience`

### `audit_trails` (FYP Table 136)

| Field | Type | Description |
|-------|------|-------------|
| `action` | string | Action performed |
| `user_id` | string | Actor's user ID |
| `target_entity` | string | Entity type affected |
| `entity_id` | string | Entity identifier |
| `old_value` | any | Previous value (nullable) |
| `new_value` | any | New value (nullable) |
| `ip_address` | string | Captured from request |
| `user_agent` | string | Captured from request |
| `timestamp` | datetime | Action timestamp |
| `severity` | string | `INFO` / `WARNING` / `ERROR` |

**Indexes:** `user_id`, `action`, `timestamp`, compound `(user_id, timestamp)`, compound `(target_entity, entity_id)`

### `media_assets` (FYP Table 137)

| Field | Type | Description |
|-------|------|-------------|
| `uploader_id` | string | Uploader's user ID |
| `s3_url` | string | S3 file URL |
| `s3_key` | string | S3 object key (**unique**) |
| `file_type` | string | MIME type |
| `file_name` | string | Original filename |
| `size_bytes` | integer | File size |
| `upload_date` | datetime | Upload timestamp |
| `entity_type` | string | Associated entity type |
| `entity_id` | string | Associated entity ID |
| `is_public` | boolean | Public visibility flag |
| `scan_status` | string | Virus scan status |

**Indexes:** `uploader_id`, `s3_key` (unique), compound `(entity_type, entity_id)`

### `notifications` (FYP Table 138)

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | string | Recipient's user ID |
| `title` | string | Notification title |
| `message` | string | Notification body |
| `type` | string | `info` / `warning` / `alert` |
| `priority` | string | `low` / `medium` / `high` |
| `is_read` | boolean | Read status |
| `read_at` | datetime | When marked as read |
| `created_at` | datetime | Creation timestamp |
| `expires_at` | datetime | Auto-delete after this time |
| `action_url` | string | Deep link URL |
| `metadata` | object | Extra payload |

**Indexes:** `user_id`, `is_read`, `created_at`, compound `(user_id, is_read, created_at)`
**TTL Index:** `expires_at` → auto-deletes expired notifications

### `system_logs` (FYP Table 141)

| Field | Type | Description |
|-------|------|-------------|
| `service_name` | string | Source service |
| `level` | string | `INFO` / `WARNING` / `ERROR` / `CRITICAL` |
| `message` | string | Log message |
| `stack_trace` | string | Optional stack trace |
| `timestamp` | datetime | Log timestamp |
| `context` | object | Extra context data |
| `environment` | string | `production` / `development` |

**Indexes:** `service_name`, `level`, compound `(service_name, level, timestamp)`
**TTL Index:** `timestamp` → auto-deletes after **30 days** (2,592,000 seconds)

---

## Redis Patterns

| Key Pattern | TTL | Type | Description |
|------------|-----|------|-------------|
| `notifications:{user_id}` | 7 days (604,800 s) | List (`LPUSH`) | Notification queue — stores serialized notification IDs per user |
| `feature:{feature_name}` | None (persistent) | String (JSON) | Feature flag — `{enabled, rollout_percentage, target_roles}` |
| `session:{user_id}` | 1 hour | String (JSON) | Active auth session JSON used to validate protected requests |

---

## API Endpoints (29 total)

All routes prefixed `/api/v1/ops`.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check |

### Grievances (6 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/ops/grievances` | Any user | Create grievance — auto-routes via NLP |
| GET | `/api/v1/ops/grievances/me` | Any user | List current student's grievances |
| GET | `/api/v1/ops/grievances` | admin, hod | List all grievances (optional `?status=` filter) |
| PUT | `/api/v1/ops/grievances/{ticket_id}/status` | admin, hod | Update status/resolution; auto-escalates if urgent + >48h |
| GET | `/api/v1/ops/grievances/{ticket_id}/comments` | Any user | List comments on a grievance |
| POST | `/api/v1/ops/grievances/{ticket_id}/comments` | Any user | Add comment to a grievance |

### Announcements (4 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/ops/announcements` | admin, faculty | Create announcement |
| GET | `/api/v1/ops/announcements` | Any user | List announcements (filtered by role + "all", pinned first) |
| GET | `/api/v1/ops/announcements/{id}` | Any user | Get single announcement (increments `view_count`) |
| DELETE | `/api/v1/ops/announcements/{id}` | admin | Delete announcement |

### Audit Trails (2 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/ops/audit-trails` | Any user | Record audit trail entry (captures IP + user agent) |
| GET | `/api/v1/ops/audit-trails` | admin | Query audit trails (filters: `user_id`, `action`, `target_entity`, `limit`) |

### Notifications (4 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/ops/notifications` | admin, faculty | Create notification + push to Redis queue |
| GET | `/api/v1/ops/notifications/me` | Any user | Current user's notifications (optional `?is_read=` filter) |
| PUT | `/api/v1/ops/notifications/{id}/read` | Any user | Mark single notification as read |
| PUT | `/api/v1/ops/notifications/read-all` | Any user | Mark all unread notifications as read |

### Media Assets (3 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/ops/media-assets` | Any user | Register media asset (post-upload metadata) |
| GET | `/api/v1/ops/media-assets` | Any user | List media assets (optional `entity_type`/`entity_id` filter) |
| DELETE | `/api/v1/ops/media-assets/{id}` | Any user | Delete own media asset |

### System Logs (2 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/ops/system-logs` | Any user | Ingest structured log entry |
| GET | `/api/v1/ops/system-logs` | admin | Query logs (optional `service_name`, `level` filter) |

### Feature Flags & Cache (7 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/feature-flags/{name}` | admin | Create/update feature flag in Redis |
| GET | `/feature-flags/{name}` | Any user | Check if feature flag is enabled (role-aware) |
| GET | `/feature-flags` | admin | List all feature flags via `SCAN` |
| DELETE | `/feature-flags/{name}` | admin | Delete a feature flag |
| GET | `/cache/query/{hash}` | admin | Inspect query-cache entry by hash |
| DELETE | `/cache/query` | admin | Clear all query-cache entries |
| GET | `/cache/ratelimit` | admin | Inspect ratelimit counter and TTL for IP/Endpoint |

---

## Pydantic Schemas (16 total)

| Schema | Type | Key Fields |
|--------|------|------------|
| `GrievanceCreate` | Request | `category`, `subject?`, `description` |
| `GrievanceOut` | Response | `ticket_id`, `student_id`, `category`, `status`, `assigned_department`, `is_urgent`, `priority` |
| `GrievanceStatusUpdate` | Request | `status`, `resolution?` |
| `GrievanceCommentCreate` | Request | `comment` |
| `GrievanceCommentOut` | Response | `comment_id`, `ticket_id`, `user_id`, `comment`, `created_at` |
| `AnnouncementCreate` | Request | `title`, `content`, `target_audience` (default `["all"]`), `priority`, `is_pinned`, `attachments` |
| `AnnouncementOut` | Response | `id`, `title`, `content`, `author_id`, `target_audience`, `view_count` |
| `AuditTrailCreate` | Request | `action`, `target_entity`, `entity_id`, `severity` (default `"INFO"`) |
| `AuditTrailOut` | Response | `id`, `action`, `user_id`, `ip_address`, `user_agent`, `timestamp` |
| `MediaAssetCreate` | Request | `s3_url`, `s3_key`, `file_type`, `file_name`, `size_bytes`, `entity_type`, `entity_id`, `is_public` |
| `MediaAssetOut` | Response | `id`, `uploader_id`, `s3_url`, `s3_key`, `scan_status` |
| `NotificationCreate` | Request | `user_id`, `title`, `message`, `type`, `priority`, `expires_at?` |
| `NotificationOut` | Response | `id`, `user_id`, `title`, `message`, `is_read`, `created_at` |
| `SystemLogCreate` | Request | `service_name`, `level`, `message`, `stack_trace?`, `context?` |
| `SystemLogOut` | Response | `id`, `service_name`, `level`, `message`, `timestamp` |
| `MessageResponse` | Response | `message` |

---

## Special Logic

### NLP Grievance Router (`nlp_router.py`)

Two-tier routing system for auto-assigning grievances to departments:

1. **Keyword Matching** — a `ROUTING_MAP` dictionary maps keywords to departments:
   - `wifi / internet / network / computer` → **IT Department**
   - `cleanliness / broken / maintenance` → **Estate Department**
   - `harassment / bullying / discrimination` → **Student Affairs** (marked **URGENT**)
   - `grade / marks / result` → **Examination Department**
   - `fee / payment / scholarship` → **Finance Department**
   - `library / book` → **Library Department**

2. **Gemini AI Fallback** — if no keyword matches and `GEMINI_API_KEY` is set, sends complaint text to `gemini-pro` with structured JSON prompt. Returns department + urgency classification.

3. **Final Fallback** → `"General Administration"` if both methods fail.

### Auto-Escalation

When updating a grievance status: if the ticket is **urgent** AND older than **48 hours** AND not being resolved, priority auto-escalates to `"Escalated"`.

### Announcement Visibility

Announcements are filtered by user role — users only see announcements where `target_audience` contains their role or `"all"`. Results are sorted pinned-first, then by date descending.

### MongoDB TTL Indexes

- **Notifications:** `expires_at` → auto-deletes at the specified expiry datetime
- **System Logs:** `timestamp` → auto-deletes after 30 days

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
| `motor` | Async MongoDB driver |
| `google-generativeai` | Gemini API for NLP grievance routing |
| `redis` | Async Redis client |

---

## Cross-Service Dependencies

| Dependency | Direction | Description |
|-----------|-----------|-------------|
| `sis_students` | Read (PostgreSQL) | Resolves student_id for grievance creation |
| Notification Redis queue | Write | Pushes notification IDs for other services to consume |
