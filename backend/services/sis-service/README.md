# SIS Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> **Student Information System microservice for Project Nexus**

## Overview

The SIS Service manages core academic data: students, departments, programs, faculty, semesters, enrollments, transcripts, and notifications. It also consumes Kafka grade events to auto-calculate SGPA/CGPA, and provides Redis-cached grade lookups and CGPA leaderboards.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **PostgreSQL** | Primary database (SQLAlchemy ORM) |
| **Redis** | Grade cache, CGPA leaderboard (Sorted Set) |
| **Kafka** | Consumer for `grade_submitted` events |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
sis-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py            # Settings & environment variables
    ├── database.py          # PostgreSQL engine + Redis client
    ├── dependencies.py      # JWT auth & role guard
    ├── kafka_consumer.py    # Kafka consumer for grade events
    ├── main.py              # FastAPI app entrypoint
    ├── models.py            # SQLAlchemy ORM models
    ├── routes.py            # All API endpoints (28 routes)
    └── schemas.py           # Pydantic request/response schemas
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

### `SisDepartment` — table `sis_departments`
| Column | Type | Constraints |
|--------|------|-------------|
| `dept_id` | Integer | PK, autoincrement |
| `name` | String(100) | NOT NULL |
| `code` | String(10) | UNIQUE, NOT NULL |
| `location` | String(100) | — |

### `SisProgram` — table `sis_programs`
| Column | Type | Constraints |
|--------|------|-------------|
| `program_id` | Integer | PK, autoincrement |
| `dept_id` | Integer | FK → sis_departments.dept_id |
| `title` | String(100) | NOT NULL |
| `degree_level` | String(20) | — |
| `total_semesters` | Integer | — |

### `SisSemester` — table `sis_semesters`
| Column | Type | Constraints |
|--------|------|-------------|
| `semester_id` | Integer | PK, autoincrement |
| `title` | String(50) | NOT NULL |
| `start_date` | Date | — |
| `end_date` | Date | — |
| `is_active` | Boolean | default False |

### `SisStudent` — table `sis_students`
| Column | Type | Constraints |
|--------|------|-------------|
| `student_id` | Integer | PK, autoincrement |
| `user_id` | UUID | NOT NULL |
| `program_id` | Integer | FK → sis_programs.program_id |
| `roll_no` | String(20) | UNIQUE, NOT NULL |
| `cnic` | String(15) | UNIQUE |
| `dob` | Date | — |
| `address` | Text | — |
| `phone` | String(20) | — |
| `blood_group` | String(5) | — |
| `guardian_name` | String(100) | — |
| `guardian_phone` | String(20) | — |
| `current_semester` | Integer | — |
| `current_risk_status` | String(20) | default "Green" |
| `profile_image_id` | String(100) | — |
| `scholarship_percentage` | Float | default 0.0 |

### `SisFaculty` — table `sis_faculty`
| Column | Type | Constraints |
|--------|------|-------------|
| `faculty_id` | Integer | PK, autoincrement |
| `user_id` | UUID | NOT NULL |
| `dept_id` | Integer | FK → sis_departments.dept_id |
| `employee_code` | String(20) | UNIQUE, NOT NULL |
| `designation` | String(50) | — |
| `phone` | String(20) | — |
| `specialization` | String(100) | — |
| `office_location` | String(100) | — |
| `employment_status` | String(30) | — |
| `joining_date` | Date | — |
| `qualification` | String(150) | — |
| `experience` | String(100) | — |
| `research_interests` | Text | — |
| `publications` | Text | — |
| `personal_email` | String(255) | — |
| `linkedin_url` | String(255) | — |
| `office_hours` | String(100) | — |
| `salary_tier_encrypted` | Text | — |
| `profile_image_id` | String(100) | — |

### `SisFacultyAvailability` — table `sis_faculty_availability`
| Column | Type | Constraints |
|--------|------|-------------|
| `avail_id` | Integer | PK, autoincrement |
| `faculty_id` | Integer | FK → sis_faculty.faculty_id |
| `day_of_week` | String(10) | — |
| `start_time` | Time | — |
| `end_time` | Time | — |
| `is_available` | Boolean | default True |

### `SisEnrollment` — table `sis_enrollments`
| Column | Type | Constraints |
|--------|------|-------------|
| `enrollment_id` | Integer | PK, autoincrement |
| `student_id` | Integer | FK → sis_students.student_id |
| `section_id` | Integer | FK → lms_sections.section_id |
| `status` | String(20) | default "Enrolled" |
| `final_grade_points` | Float | nullable |

### `SisTranscript` — table `sis_transcripts`
| Column | Type | Constraints |
|--------|------|-------------|
| `transcript_id` | Integer | PK, autoincrement |
| `student_id` | Integer | FK → sis_students.student_id |
| `semester_id` | Integer | FK → sis_semesters.semester_id |
| `sgpa` | Float | — |
| `cgpa` | Float | — |
| `generated_at` | TIMESTAMP | server default now() |

### Cross-Service Mirrors (read-only)
- `LmsSection` — table `lms_sections`
- `FinInvoice` — table `fin_invoices`
- `Notification` — table `notifications`

> **Note**: `sis_classrooms` is managed by the Scheduler Service. `sis_department_heads` is defined in the database schema but currently lacks an API implementation in this service.

## Redis Usage

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `grade:{student_id}:{course_id}` | 2 hours | Cached grade data (JSON with grade, gpa, updated_at) |
| `leaderboard:{program_id}:{semester_id}` | 1 hour | CGPA leaderboard (Redis Sorted Set / ZSET) |

## API Endpoints

All endpoints are prefixed with `/api/v1/sis`.

### Students
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | `GET` | `/students/me` | Yes | Get own student profile |
| 2 | `GET` | `/students` | Admin | List all students |
| 3 | `GET` | `/students/{student_id}` | Yes | Get student by ID |
| 4 | `PUT` | `/students/{student_id}` | Yes | Update student profile |

### Enrollments
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 5 | `POST` | `/enrollments` | Yes | Enroll in a section (duplicate check) |
| 6 | `GET` | `/enrollments/me` | Yes | List own enrollments |
| 7 | `DELETE` | `/enrollments/{enrollment_id}` | Yes | Withdraw from a course (soft delete) |

### Transcripts
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 8 | `GET` | `/transcripts/me` | Yes | Get own transcript list |
| 9 | `GET` | `/transcripts/me/pdf` | Yes | Download transcript as PDF (blocked if unpaid invoices exist) |

### Semesters
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 10 | `GET` | `/semesters` | No | List all semesters |
| 11 | `GET` | `/semesters/active` | No | Get active semester |

### Departments
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 12 | `GET` | `/departments` | No | List all departments |
| 13 | `POST` | `/departments` | Admin | Create department |
| 14 | `PUT` | `/departments/{dept_id}` | Admin | Update department |
| 15 | `DELETE` | `/departments/{dept_id}` | Admin | Delete department |

### Programs
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 16 | `GET` | `/programs` | No | List all programs with student and faculty counts |
| 17 | `POST` | `/programs` | Admin | Create program |
| 18 | `PUT` | `/programs/{program_id}` | Admin | Update program |
| 19 | `DELETE` | `/programs/{program_id}` | Admin | Delete program |
| 20 | `POST` | `/programs/{program_id}/enroll-all` | Admin | Auto-enroll all students in program courses + sync chat groups |

### Faculty
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 21 | `GET` | `/faculty` | Admin | List all faculty |
| 22 | `POST` | `/faculty` | Admin | Create faculty profile |
| 23 | `PUT` | `/faculty/{faculty_id}` | Admin | Update faculty profile |
| 24 | `GET` | `/faculty/me` | Teacher | Get own faculty profile |
| 25 | `PUT` | `/faculty/me` | Teacher | Update own faculty profile |
| 26 | `GET` | `/faculty/me/students` | Teacher | List students enrolled in my sections |

### Relationships & Participants
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 27 | `GET` | `/students/me/teachers` | Student | List teachers for my enrolled courses |
| 28 | `GET` | `/students/me/classmates` | Student | List classmates in my sections |
| 29 | `GET` | `/sections/{section_id}/participants` | Yes | Get all students and teacher for a section |

### Faculty Availability
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 30 | `GET` | `/faculty/me/availability` | Teacher | Get my availability slots |
| 31 | `POST` | `/faculty/me/availability` | Teacher | Add an availability slot |
| 32 | `DELETE` | `/faculty/me/availability/{avail_id}` | Teacher | Remove an availability slot |

### Notifications
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 33 | `GET` | `/notifications` | Yes | List user's notifications |
| 34 | `PUT` | `/notifications/{notification_id}/read` | Yes | Mark notification as read |
| 35 | `PUT` | `/notifications/read-all` | Yes | Mark all notifications as read |

### Grade Cache (Redis)
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 36 | `GET` | `/grades/{student_id}/{course_id}` | Yes | Get grade from Redis cache (2h TTL, DB fallback) |

### CGPA Leaderboard (Redis Sorted Set)
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 37 | `GET` | `/leaderboard/{program_id}/{semester_id}` | Yes | CGPA leaderboard (1h TTL, optional `?top=10`) |

### Health
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 38 | `GET` | `/health` | No | Health check |

## Kafka Consumer

Runs as a separate process (`python -m app.kafka_consumer`).

| Topic | Group ID | Action |
|-------|----------|--------|
| `grade_submitted` | `sis-service-grade-consumer` | Updates enrollment grade → recalculates SGPA → recalculates CGPA → upserts transcript |

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
reportlab
kafka-python
redis
```
