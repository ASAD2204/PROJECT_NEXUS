# Analytics Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> **Analytics & Risk Prediction microservice for Project Nexus**

## Overview

The Analytics Service is an authenticated aggregation service that provides dashboards for admin, faculty, and students. It implements student at-risk prediction using a RandomForest ML classifier, tracks frontend analytics events in MongoDB, enforces Redis-backed session validation on protected requests, and mirrors 14 PostgreSQL tables from other services for cross-cutting KPI calculations.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **PostgreSQL** | Mirror of 14 cross-service tables (SQLAlchemy) |
| **MongoDB** | Analytics events storage (Motor async driver) |
| **scikit-learn** | RandomForest classifier for risk prediction |
| **pandas** | DataFrame manipulation for ML training |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
analytics-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py          # Settings & environment variables
    ├── database.py        # PostgreSQL + MongoDB connections
    ├── dependencies.py    # JWT auth & role guard
    ├── main.py            # FastAPI app entrypoint
    ├── ml_model.py        # RandomForest risk prediction model
    ├── models.py          # SQLAlchemy ORM models (14 mirrors)
    ├── routes.py          # All API endpoints (10 routes)
    └── schemas.py         # Pydantic request/response schemas (14 schemas)
```

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | `str` | *required* | PostgreSQL connection string |
| `REDIS_URL` | `str` | `redis://redis:6379` | Redis connection string |
| `KAFKA_BROKER` | `str` | `kafka:9092` | Kafka broker address |
| `MONGO_URL` | `str` | `mongodb://mongodb:27017/nexus_analytics` | MongoDB connection string |
| `JWT_SECRET` | `str` | *required* | Secret key for JWT signing |
| `JWT_ALGORITHM` | `str` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `int` | `60` | Token expiry in minutes |

## Database Models (15 Read-Only Mirrors)

All models use `extend_existing = True` — they mirror tables owned by other services sharing the same PostgreSQL database.

### Auth
- `AuthUser` → `auth_users` (user_id, first_name, last_name, email, is_active)

### SIS
- `SisStudent` → `sis_students` (student_id, user_id, program_id, roll_no, current_semester, current_risk_status)
- `SisFaculty` → `sis_faculty` (faculty_id, user_id, dept_id, employee_code, designation)
- `SisEnrollment` → `sis_enrollments` (enrollment_id, student_id, section_id, status, final_grade_points)
- `SisTranscript` → `sis_transcripts` (transcript_id, student_id, semester_id, sgpa, cgpa)

### LMS
- `LmsSection` → `lms_sections` (section_id, course_id, semester_id, faculty_id)
- `LmsCourse` → `lms_courses` (course_id, dept_id, code, title, credit_hours)
- `LmsAttendance` → `lms_attendance` (attendance_id, section_id, student_id, date, status)
- `LmsAssignment` → `lms_assignments` (assignment_id, section_id, title, total_marks, due_date)
- `LmsSubmission` → `lms_submissions` (sub_id, assignment_id, student_id, marks_obtained)
- `LmsQuiz` → `lms_quizzes` (quiz_id, section_id, title)
- `LmsAnswer` → `lms_answers` (answer_id, student_id, quiz_id, score_obtained)

### Finance
- `FinInvoice` → `fin_invoices` (invoice_id, student_id, total_amount, status)
- `FinTransaction` → `fin_transactions` (trx_id, invoice_id, amount_paid)

## MongoDB Collections

| Collection | Database | Description |
|------------|----------|-------------|
| `analytics_events` | `nexus_analytics` | Frontend analytics events (page views, clicks, etc.) |

**Indexes:** `event_type`, `user_id`, `timestamp`, compound `(event_type, timestamp)`

## ML Risk Prediction

### Features (4 inputs)
| Feature | Description |
|---------|-------------|
| `attendance_pct` | Attendance percentage |
| `avg_quiz_score` | Average quiz score |
| `assignment_submission_rate` | Assignment submission rate |
| `cgpa` | Cumulative GPA |

### Risk Levels
| Level | Color | Criteria (heuristic fallback) |
|-------|-------|-------------------------------|
| Green | Safe | attendance ≥ 75% AND cgpa ≥ 2.0 |
| Yellow | Warning | attendance ≥ 50% OR cgpa ≥ 1.5 |
| Red | At Risk | attendance < 50% AND cgpa < 1.5 |

The ML model (RandomForest) can be trained via the admin endpoint with labelled data, with the heuristic as fallback when no model is trained.

## API Endpoints

All endpoints are prefixed with `/api/v1/analytics`.

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 1 | `GET` | `/at-risk/section/{section_id}` | Yes | Faculty/Admin | Per-student risk features for a section |
| 2 | `GET` | `/dashboard/admin` | Yes | Admin | Admin KPI dashboard (students, attendance, revenue, at-risk) |
| 3 | `GET` | `/dashboard/faculty` | Yes | Faculty | Faculty dashboard (per-section performance) |
| 4 | `GET` | `/student/{student_id}/risk` | Yes | Student self / Faculty / Admin | Get risk level for a specific student |
| 5 | `GET` | `/dashboard/student` | Yes | Any | Student self-service dashboard |
| 6 | `POST` | `/model/train` | Yes | Admin | Train RandomForest risk classifier with labelled data |
| 7 | `POST` | `/events` | Yes | Any | Track a frontend analytics event |
| 8 | `GET` | `/events` | Yes | Admin | Query analytics events with filters |
| 9 | `GET` | `/events/summary` | Yes | Admin | Aggregated event type counts |
| 10 | `GET` | `/health` | No | — | Health check |

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
scikit-learn
pandas
numpy
kafka-python
joblib
motor
```
