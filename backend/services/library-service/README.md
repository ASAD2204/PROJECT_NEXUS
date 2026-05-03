# Library Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> Digital library management — book catalog, issue/return with overdue fines, reservations with auto-expiry, QR code generation, reporting dashboard, and Redis-backed session validation on protected requests.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.11) |
| PostgreSQL | SQLAlchemy ORM — books, issues, reservations, fines |
| Redis | Session validation for protected requests |
| QR Codes | `qrcode` + `Pillow` — PNG generation |
| Auth | JWT Bearer (`python-jose`) |
| Container | Docker (Python 3.11-slim, port 8000) |

---

## File Structure

```
library-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py          # Pydantic Settings — env vars
    ├── database.py        # SQLAlchemy engine, session factory, get_db
    ├── dependencies.py    # get_current_user, require_role (JWT + Redis session)
    ├── main.py            # FastAPI app, CORS, auto-migration on startup
    ├── models.py          # 5 PostgreSQL ORM models
    ├── schemas.py         # 12 Pydantic request/response schemas
    └── routes.py          # All API endpoints (15 total, 521 lines)
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | No | `60` | JWT expiry (declared, not used) |
| `REDIS_URL` | No | `redis://redis:6379` | Redis connection used for auth session validation |
| `KAFKA_BROKER` | No | `kafka:9092` | Declared but unused |

---

## PostgreSQL Models

### `lib_books`

| Column | Type | Constraints |
|--------|------|-------------|
| `book_id` | Integer | **PK**, autoincrement |
| `isbn` | String(20) | **UNIQUE**, NOT NULL, indexed |
| `title` | String(300) | NOT NULL, indexed |
| `author` | String(200) | NOT NULL, indexed |
| `category` | String(50) | nullable |
| `publisher` | String(100) | nullable |
| `publication_year` | Integer | nullable |
| `pages` | Integer | nullable |
| `cover_image` | String(255) | nullable |
| `description` | String | nullable |
| `language` | String(30) | default `"English"` |
| `total_copies` | Integer | NOT NULL, default 1 |
| `available_copies` | Integer | NOT NULL, default 1 |
| `shelf_location` | String(50) | nullable |
| `created_at` | DateTime | server_default `now()` |
| `updated_at` | DateTime | server_default `now()`, onupdate |

### `lib_issues`

| Column | Type | Constraints |
|--------|------|-------------|
| `issue_id` | Integer | **PK**, autoincrement |
| `student_id` | Integer | FK → `sis_students.student_id`, indexed |
| `book_id` | Integer | FK → `lib_books.book_id`, indexed |
| `issue_date` | Date | NOT NULL, default `today` |
| `due_date` | Date | NOT NULL |
| `return_date` | Date | nullable |
| `status` | String(20) | NOT NULL, default `"Issued"` — enum: `Issued` / `Returned` / `Lost` |
| `created_at` | DateTime | server_default `now()` |
| `updated_at` | DateTime | server_default `now()`, onupdate |

### `lib_reservations`

| Column | Type | Constraints |
|--------|------|-------------|
| `reservation_id` | Integer | **PK**, autoincrement |
| `student_id` | Integer | FK → `sis_students.student_id` |
| `book_id` | Integer | FK → `lib_books.book_id` |
| `reserved_at` | DateTime | server_default `now()` |
| `expires_at` | DateTime | nullable (set to +3 days on creation) |
| `status` | String(20) | default `"Active"` — enum: `Active` / `Fulfilled` / `Cancelled` / `Expired` |

### `lib_librarian_profiles`

| Column | Type | Constraints |
|--------|------|-------------|
| `librarian_profile_id` | Integer | **PK**, autoincrement |
| `user_id` | UUID | NOT NULL, UNIQUE |
| `employee_code` | String(20) | UNIQUE |
| `shift` | String(20) | — |
| `assigned_section` | String(100) | — |
| `working_hours` | String(100) | — |
| `profile_image_id` | String(255) | — |

### `sis_students` (read-only mirror)

| Column | Type | Constraints |
|--------|------|-------------|
| `student_id` | Integer | **PK** |
| `user_id` | UUID | — |
| `roll_no` | String | — |

### `fin_fines` (cross-service write target)

| Column | Type | Constraints |
|--------|------|-------------|
| `fine_id` | Integer | **PK**, autoincrement |
| `invoice_id` | Integer | nullable |
| `days_overdue` | Integer | nullable |
| `fine_amount` | Numeric(10,2) | NOT NULL |
| `applied_at` | DateTime | server_default `now()` |

## Redis Usage

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `session:{user_id}` | 1 hour | Active auth session JSON used to validate protected requests |

---

## Business Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `FINE_PER_DAY` | **PKR 50** | Daily overdue fine rate |
| `LOAN_PERIOD_DAYS` | **14 days** | Loan period from issue date |
| `MAX_ACTIVE_ISSUES` | **3** | Maximum concurrent issued books per student |

---

## API Endpoints (15 total)

All routes prefixed `/api/v1/library`.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check |

### Book Catalog (7 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/books` | None | Search catalog by title, author, isbn |
| GET | `/books/export` | admin, librarian | Export catalog as CSV |
| POST | `/books/import` | admin, librarian | Import books from CSV |
| GET | `/books/{book_id}` | None | Get book details |
| POST | `/books` | admin, librarian | Add a new book |
| PUT | `/books/{book_id}` | admin, librarian | Update book info |
| DELETE | `/books/{book_id}` | admin, librarian | Delete book |

### Issue/Return (4 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/issues` | admin, librarian | List all issue records |
| POST | `/issues` | admin, librarian | Issue book (max 3 per student) |
| POST | `/returns/{issue_id}` | admin, librarian | Process return or **renew** (action=renew) |
| GET | `/issues/me` | Any user | Current student's issue history |

### QR Code & Profile (3 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/qr/{student_id}` | Any user | Generate QR code for student ID |
| GET | `/librarian/me` | librarian | Get own librarian profile |
| PUT | `/librarian/me` | librarian | Update own librarian profile |

### Reservations (5 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reservations` | Any user | Reserve a book (3-day expiry) |
| GET | `/reservations` | admin, librarian | List all active reservations |
| GET | `/reservations/me` | Any user | Current student's reservations |
| PUT | `/reservations/{reservation_id}` | admin, librarian | Update reservation status (Fulfilled, etc.) |
| DELETE | `/reservations/{reservation_id}` | Any user | Cancel a reservation |

### Reports (2 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports` | admin, librarian | Library stats dashboard |
| GET | `/stats` | admin, librarian | Alias for reports endpoint |

---

## Pydantic Schemas (12 total)

| Schema | Type | Key Fields |
|--------|------|------------|
| `BookCreate` | Request | `isbn*`, `title*`, `author*`, `category`, `publisher`, `total_copies` (≥1), `language` (default `"English"`) |
| `BookUpdate` | Request | All BookCreate fields but optional |
| `BookOut` | Response | All `lib_books` columns |
| `IssueCreate` | Request | `student_id`, `book_id` |
| `IssueOut` | Response | All `lib_issues` columns |
| `IssueDetailOut` | Response | Extends IssueOut + nested `book: BookOut` |
| `ReturnOut` | Response | `issue_id`, `return_date`, `days_overdue`, `fine_amount`, `fine_status`, `message` |
| `QRRequest` | Request | `student_id: str` (defined but unused — QR uses path param) |
| `ReservationCreate` | Request | `student_id`, `book_id` |
| `ReservationOut` | Response | All reservation columns + nested `book: BookOut` |
| `LibraryStatsOut` | Response | `total_books`, `total_issued`, `total_overdue`, `total_reservations`, `books_by_category`, `recent_transactions` |
| `MessageOut` | Response | `detail` |

---

## Special Logic

### Fine Calculation

```
calculate_fine(due_date, return_date):
    if return_date <= due_date → PKR 0
    else → days_overdue × PKR 50
```

On return, if overdue, a `FinFine` record is **inserted directly** into the shared `fin_fines` table (cross-service write — no inter-service API call).

### Loan Period

`due_date = issue_date + 14 days`

### Maximum Active Issues

At issue time, the system checks for active issues (status = `"Issued"`) for the student. Blocks with 400 if the student already has 3 active issues.

### Reservation Expiry

- Reservations expire **3 days** after creation
- Duplicate active reservation for the same student + book is rejected (409)

### QR Code Generation

- Uses `qrcode.QRCode` with `ERROR_CORRECT_M`, box_size=10, border=4
- Renders to PNG in-memory via `BytesIO`
- Returns as `StreamingResponse` with `media_type="image/png"`
- Content-Disposition: `inline; filename=qr_{student_id}.png`

### Book Deletion Safety

Cannot delete a book that has active (status = `"Issued"`) issues — returns 400.

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
| `qrcode` | QR code generation |
| `Pillow` | Image rendering (PNG output for QR codes) |

---

## Cross-Service Dependencies

| Dependency | Direction | Description |
|-----------|-----------|-------------|
| `sis_students` | Read (PostgreSQL) | Resolves `user_id` → `student_id` for `/issues/me` and `/reservations/me` |
| `fin_fines` | Write (PostgreSQL) | Inserts overdue fine records directly into the finance service table |
