# Alumni Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> Alumni engagement platform — registration, directory, job board (admin-approved), events with registration, mentorship profiles, and success stories (admin-approved).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.11) |
| PostgreSQL | SQLAlchemy ORM — 7 tables |
| Auth | JWT Bearer (`python-jose`) |
| Container | Docker (Python 3.11-slim, port 8000) |

---

## File Structure

```
alumni-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py          # Pydantic Settings — env vars
    ├── database.py        # SQLAlchemy engine, session factory, get_db
    ├── dependencies.py    # get_current_user, require_role (JWT + Redis session)
    ├── main.py            # FastAPI app, CORS, auto-migration on startup
    ├── models.py          # 7 PostgreSQL ORM models
    ├── schemas.py         # 13 Pydantic request/response schemas
    └── routes.py          # All API endpoints (16 total)
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | No | `60` | JWT expiry (declared, not used) |
| `REDIS_URL` | No | `redis://redis:6379` | Redis session lookup for auth checks |
| `KAFKA_BROKER` | No | `kafka:9092` | Declared but unused |

---

## PostgreSQL Models (7 tables)

### `sis_students` (read-only mirror — `extend_existing=True`)

| Column | Type | Constraints |
|--------|------|-------------|
| `student_id` | Integer | **PK** |
| `user_id` | UUID | NOT NULL |
| `roll_no` | String(20) | NOT NULL |

### `alumni_registry`

| Column | Type | Constraints |
|--------|------|-------------|
| `alumni_id` | Integer | **PK**, autoincrement |
| `student_id` | Integer | FK → `sis_students.student_id`, CASCADE, **UNIQUE** |
| `grad_year` | Integer | NOT NULL |
| `degree` | String(100) | nullable |
| `current_employer` | String(100) | nullable |
| `current_position` | String(100) | nullable |
| `location` | String(100) | nullable |
| `photo_url` | String(255) | nullable |
| `linkedin_url` | String(255) | nullable |
| `achievements` | Text | nullable (JSON array as text) |
| `expertise` | Text | nullable (JSON array as text) |

### `alumni_jobs`

| Column | Type | Constraints |
|--------|------|-------------|
| `job_id` | Integer | **PK**, autoincrement |
| `alumni_id` | Integer | FK → `alumni_registry.alumni_id`, CASCADE |
| `title` | String(100) | NOT NULL |
| `company` | String(100) | NOT NULL |
| `description` | Text | nullable |
| `apply_link` | String(255) | nullable |
| `location` | String(100) | nullable |
| `job_type` | String(50) | nullable |
| `posted_at` | TIMESTAMP | server_default `current_timestamp()` |
| `is_active` | Boolean | default `True` |
| `status` | String(20) | default `"Pending"` |

### `alumni_events`

| Column | Type | Constraints |
|--------|------|-------------|
| `event_id` | Integer | **PK**, autoincrement |
| `title` | String(200) | NOT NULL |
| `description` | Text | nullable |
| `event_date` | Date | NOT NULL |
| `event_time` | Time | nullable |
| `venue` | String(200) | nullable |
| `event_type` | String(50) | nullable |
| `capacity` | Integer | nullable |
| `registered_count` | Integer | default 0 |
| `fee` | Numeric(10,2) | default 0 |
| `organizer` | String(100) | nullable |
| `cover_image` | String(255) | nullable |
| `status` | String(20) | default `"Upcoming"` |
| `created_by` | UUID | nullable |
| `created_at` | TIMESTAMP | server_default `current_timestamp()` |

### `alumni_event_registrations`

| Column | Type | Constraints |
|--------|------|-------------|
| `registration_id` | Integer | **PK**, autoincrement |
| `event_id` | Integer | FK → `alumni_events.event_id`, CASCADE |
| `alumni_id` | Integer | FK → `alumni_registry.alumni_id`, CASCADE |
| `registered_at` | TIMESTAMP | server_default `current_timestamp()` |

**UniqueConstraint:** `(event_id, alumni_id)` — prevents duplicate registration

### `alumni_mentorship`

| Column | Type | Constraints |
|--------|------|-------------|
| `mentorship_id` | Integer | **PK**, autoincrement |
| `mentor_id` | Integer | FK → `alumni_registry.alumni_id`, CASCADE, **UNIQUE** |
| `specialization` | String(100) | nullable |
| `bio` | Text | nullable |
| `available_slots` | Integer | default 5 |
| `sessions_completed` | Integer | default 0 |
| `rating` | Float | default 0 |
| `is_active` | Boolean | default `True` |
| `created_at` | TIMESTAMP | server_default `current_timestamp()` |

### `alumni_success_stories`

| Column | Type | Constraints |
|--------|------|-------------|
| `story_id` | Integer | **PK**, autoincrement |
| `alumni_id` | Integer | FK → `alumni_registry.alumni_id`, CASCADE |
| `title` | String(200) | NOT NULL |
| `content` | Text | NOT NULL |
| `cover_image` | String(255) | nullable |
| `likes_count` | Integer | default 0 |
| `is_featured` | Boolean | default `False` |
| `status` | String(20) | default `"Pending"` |
| `published_at` | TIMESTAMP | nullable |
| `created_at` | TIMESTAMP | server_default `current_timestamp()` |

---

## API Endpoints (21 total)

All routes prefixed `/api/v1/alumni`.

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check |

### Registration & Directory (5 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | admin / alumni | Register alumni (prevents duplicates) |
| GET | `/directory` | Any user | Browse alumni with filters (year, employer) |
| GET | `/export` | admin | Export alumni directory as CSV |
| POST | `/import` | admin | Bulk import alumni from CSV |
| GET | `/{alumni_id}` | Any user | Get single alumni profile (catch-all) |

### Profile & Management (3 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/profile` | alumni | Get authenticated alumni's profile |
| PUT | `/profile` | alumni | Update own alumni profile |
| PUT | `/{alumni_id}` | admin | Admin update of any alumni profile |
| DELETE | `/{alumni_id}` | admin | Admin delete of alumni and related records |

### Job Board (3 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobs` | Any user | List active + approved job postings |
| POST | `/jobs` | alumni | Post a job (starts as "Pending", supports multipart cover image) |
| PUT | `/jobs/{job_id}/approve` | admin | Approve a pending job posting |

### Events (3 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | Any user | List all events (sorted by date) |
| POST | `/events` | admin, alumni | Create event (supports multipart cover image) |
| POST | `/events/{event_id}/register` | Any user | Register for an event |

### Mentorship & Stories (5 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mentorship` | Any user | List mentorship entries |
| POST | `/mentorship` | alumni | Offer mentorship (one per alumni) |
| GET | `/stories` | Any user | List approved success stories |
| POST | `/stories` | alumni | Submit story (starts as "Pending", supports multipart image) |
| PUT | `/stories/{story_id}/approve` | admin | Approve a success story |

### Reports & Assets (2 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports/pdf` | admin | Generate alumni engagement report as PDF |
| GET | `/uploads/{filename}` | None | Serve uploaded alumni images |

---

## Pydantic Schemas (13 total)

| Schema | Type | Key Fields |
|--------|------|------------|
| `AlumniRegisterRequest` | Request | `student_id`, `grad_year`, `degree?`, `current_employer?`, `current_position?`, `location?`, `linkedin_url?`, `achievements?`, `expertise?` |
| `AlumniUpdateRequest` | Request | All AlumniRegisterRequest fields except `student_id` and `grad_year` — all optional |
| `AlumniOut` | Response | `alumni_id`, `student_id`, `grad_year`, `degree`, `current_employer`, `location`, `linkedin_url` |
| `JobCreate` | Request | `title*`, `company*`, `description*`, `apply_link*`, `location?`, `job_type?` |
| `JobOut` | Response | `job_id`, `alumni_id`, `title`, `company`, `posted_at`, `is_active`, `status` |
| `EventCreate` | Request | `title*`, `event_date*`, `description?`, `venue?`, `capacity?`, `fee?`, `organizer?` |
| `EventOut` | Response | `event_id`, `title`, `event_date`, `registered_count`, `status`, `created_at` |
| `MentorshipCreate` | Request | `specialization?`, `bio?`, `available_slots` (default 5) |
| `MentorshipOut` | Response | `mentorship_id`, `mentor_id`, `available_slots`, `sessions_completed`, `rating`, nested `alumni: AlumniOut` |
| `StoryCreate` | Request | `title*`, `content*`, `cover_image?` |
| `StoryOut` | Response | `story_id`, `alumni_id`, `title`, `content`, `likes_count`, `is_featured`, `status`, `published_at` |
| `MessageResponse` | Response | `message` |

---

## Special Logic

### Approval Workflows (Admin Gating)

Two entities require admin approval before public visibility:

| Entity | Created Status | Visible When | Approval Endpoint |
|--------|---------------|--------------|-------------------|
| Job Postings | `"Pending"` | `status="Approved"` AND `is_active=True` | `PUT /jobs/{job_id}/approve` |
| Success Stories | `"Pending"` | `status="Approved"` | `PUT /stories/{story_id}/approve` |

### Alumni Resolution Chain

Multiple endpoints resolve the current alumni profile via a **JWT → SIS → Alumni** chain:

```
JWT user_id → sis_students.user_id → sis_students.student_id → alumni_registry.student_id
```

Used in: `create_job`, `update_alumni_profile`, `register_for_event`, `create_mentorship`, `create_story`

### Event Registration

- Duplicate prevention at both DB level (UniqueConstraint) and application level (409 error)
- `registered_count` column exists for capacity tracking

### Mentorship

- One mentorship profile per alumni (enforced by `UNIQUE` on `mentor_id`)
- Tracks: `available_slots`, `sessions_completed`, `rating`

### Catch-All Route Ordering

`GET /{alumni_id}` is placed **last** in the router to avoid shadowing `/jobs`, `/events`, `/mentorship`, `/stories`, `/directory`, `/profile`, `/register`.

---

## Docker Configuration

| Setting | Value |
|---------|-------|
| Base Image | `python:3.11-slim` |
| System Deps | `gcc`, `libpq-dev` |
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

---

## Cross-Service Dependencies

| Dependency | Direction | Description |
|-----------|-----------|-------------|
| `sis_students` | Read (PostgreSQL) | Resolves student_id for alumni registration and JWT → alumni resolution chain |
