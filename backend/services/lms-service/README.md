# LMS Service

> **Learning Management System microservice for Project Nexus**

## Overview

The LMS Service manages courses, sections, assignments, submissions, quizzes, attendance records, timetable slots, course materials, and feedback surveys. It also provides plagiarism detection via ChromaDB vector similarity and publishes grade events to Kafka for cross-service SGPA/CGPA calculation.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **PostgreSQL** | Primary database (SQLAlchemy ORM) |
| **MongoDB** | Feedback surveys (Motor async driver) |
| **ChromaDB** | Plagiarism detection vector store |
| **Kafka** | Event producer (grade_submitted, assignment_due) |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
lms-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py            # Settings & environment variables
    ├── database.py          # PostgreSQL + MongoDB + ChromaDB connections
    ├── dependencies.py      # JWT auth & role guard
    ├── kafka_producer.py    # Kafka event publishers
    ├── main.py              # FastAPI app entrypoint
    ├── models.py            # SQLAlchemy ORM models (12 models)
    ├── routes.py            # All API endpoints (24+ routes)
    └── schemas.py           # Pydantic request/response schemas (22 schemas)
```

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | `str` | *required* | PostgreSQL connection string |
| `REDIS_URL` | `str` | `redis://redis:6379` | Redis connection string |
| `KAFKA_BROKER` | `str` | `kafka:9092` | Kafka broker address |
| `MONGO_URL` | `str` | `mongodb://mongodb:27017/nexus_lms` | MongoDB connection string |
| `CHROMA_HOST` | `str` | `chromadb` | ChromaDB hostname |
| `CHROMA_PORT` | `int` | `8000` | ChromaDB port |
| `JWT_SECRET` | `str` | *required* | Secret key for JWT signing |
| `JWT_ALGORITHM` | `str` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `int` | `60` | Token expiry in minutes |

## Database Models

### `LmsCourse` — table `lms_courses`
| Column | Type | Constraints |
|--------|------|-------------|
| `course_id` | Integer | PK, autoincrement |
| `dept_id` | Integer | — |
| `code` | String(10) | unique |
| `title` | String(100) | — |
| `credit_hours` | Integer | — |
| `description` | Text | nullable |
| `cover_image` | String(255) | nullable |

### `LmsSection` — table `lms_sections`
| Column | Type | Constraints |
|--------|------|-------------|
| `section_id` | Integer | PK, autoincrement |
| `course_id` | Integer | FK → lms_courses.course_id |
| `semester_id` | Integer | — |
| `faculty_id` | Integer | — |
| `room_no` | String(20) | — |
| `capacity` | Integer | — |

### `LmsAssignment` — table `lms_assignments`
| Column | Type | Constraints |
|--------|------|-------------|
| `assignment_id` | Integer | PK |
| `section_id` | Integer | FK → lms_sections |
| `title` | String(100) | — |
| `description` | Text | nullable |
| `total_marks` | Integer | — |
| `due_date` | TIMESTAMP | — |
| `attachment_ref_id` | String(100) | — |

### `LmsSubmission` — table `lms_submissions`
| Column | Type | Constraints |
|--------|------|-------------|
| `sub_id` | Integer | PK |
| `assignment_id` | Integer | FK → lms_assignments |
| `student_id` | Integer | — |
| `submitted_at` | TIMESTAMP | server default now() |
| `marks_obtained` | Float | nullable |
| `file_ref_id` | String(100) | — |

### `LmsQuiz` — table `lms_quizzes`
| Column | Type | Constraints |
|--------|------|-------------|
| `quiz_id` | Integer | PK |
| `section_id` | Integer | FK → lms_sections |
| `title` | String(100) | — |
| `duration_minutes` | Integer | — |
| `start_time` | TIMESTAMP | — |
| `end_time` | TIMESTAMP | — |

### `LmsQuestion` — table `lms_questions`
| Column | Type | Constraints |
|--------|------|-------------|
| `question_id` | Integer | PK |
| `quiz_id` | Integer | FK → lms_quizzes |
| `text` | Text | not null |
| `question_type` | String(20) | — |
| `marks` | Float | — |
| `correct_answer` | Text | nullable |

### `LmsAnswer` — table `lms_answers`
| Column | Type | Constraints |
|--------|------|-------------|
| `answer_id` | Integer | PK |
| `student_id` | Integer | — |
| `quiz_id` | Integer | FK → lms_quizzes |
| `question_id` | Integer | FK → lms_questions |
| `selected_option` | Text | — |
| `score_obtained` | Float | — |

### `LmsAttendance` — table `lms_attendance`
| Column | Type | Constraints |
|--------|------|-------------|
| `attendance_id` | Integer | PK |
| `section_id` | Integer | FK → lms_sections |
| `student_id` | Integer | — |
| `date` | Date | not null |
| `status` | String(10) | — |
| `check_in_time` | Time | — |
| `gps_lat` / `gps_long` | Float | — |
| `is_biometric_verified` | Boolean | default True |

### `LmsTimetableSlot` — table `lms_timetable_slots`
| Column | Type | Constraints |
|--------|------|-------------|
| `slot_id` | Integer | PK |
| `section_id` | Integer | FK → lms_sections |
| `day_of_week` | String(10) | — |
| `start_time` / `end_time` | Time | — |
| `room_no` | String(20) | — |

### `LmsCourseMaterial` — table `lms_course_materials`
| Column | Type | Constraints |
|--------|------|-------------|
| `material_id` | Integer | PK |
| `course_id` | Integer | FK → lms_courses |
| `title` | String(200) | not null |
| `file_url` | String(500) | — |
| `material_type` | String(50) | default "document" |
| `uploaded_by` | Integer | — |
| `uploaded_at` | TIMESTAMP | server default now() |

### Cross-Service Mirrors (read-only)
- `SisEnrollment` — table `sis_enrollments`
- `SisStudent` — table `sis_students`
- `SisFaculty` — table `sis_faculty`

## MongoDB Collections

| Collection | Database | Description |
|------------|----------|-------------|
| `feedback_surveys` | `nexus_lms` | Course and faculty feedback surveys |

**Indexes:** `survey_type`, `course_id`, `faculty_id`, `student_id`, `submitted_at`, compound `(faculty_id, semester_id)`

## ChromaDB Collections

| Collection | Distance Metric | Description |
|------------|----------------|-------------|
| `vectors_assignment_submissions` | Cosine | Submission embeddings for plagiarism detection (similarity > 0.85 = plagiarism) |

## API Endpoints

All endpoints are prefixed with `/api/v1/lms`.

### Courses
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/courses` | Yes | List all courses (pagination) |
| `POST` | `/courses` | Admin | Create a course |
| `GET` | `/courses/my-courses` | Yes | Get sections taught by current faculty |
| `DELETE` | `/courses/{course_id}` | Admin | Delete a course |

### Sections
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/sections` | Admin | Create a section |
| `GET` | `/sections/{section_id}` | Yes | Get section by ID |

### Assignments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/assignments/section/{section_id}` | Yes | List assignments for a section |
| `POST` | `/assignments` | Faculty/Admin | Create assignment |
| `PUT` | `/assignments/{assignment_id}` | Faculty/Admin | Update assignment |
| `DELETE` | `/assignments/{assignment_id}` | Faculty/Admin | Delete assignment |

### Submissions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/submissions` | Student | Submit assignment (blocks late submissions) |
| `GET` | `/submissions/assignment/{assignment_id}` | Faculty/Admin | List submissions |
| `PUT` | `/submissions/{sub_id}/grade` | Faculty/Admin | Grade a submission |
| `POST` | `/submissions/{id}/check-plagiarism` | Faculty/Admin | Check plagiarism via ChromaDB (cosine > 0.85) |
| `POST` | `/submissions/{id}/embed` | Yes | Index submission into ChromaDB |

### Quizzes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/quizzes` | Faculty/Admin | Create quiz with questions |
| `GET` | `/quizzes/section/{section_id}` | Yes | List quizzes for a section |
| `POST` | `/quizzes/{quiz_id}/attempt` | Student | Attempt quiz (auto-grades MCQs) |

### Grades
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/grades/submit` | Faculty/Admin | Bulk submit final grades (publishes Kafka event) |

### Timetable
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/timetable` | Admin | Create timetable slot |
| `GET` | `/timetable/section/{section_id}` | Yes | Get timetable for a section |

### Course Materials
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/materials/course/{course_id}` | Yes | List materials for a course |
| `POST` | `/materials` | Faculty/Admin | Upload course material |
| `DELETE` | `/materials/{material_id}` | Faculty/Admin | Delete course material |

### Feedback Surveys (MongoDB)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/feedback` | Student | Submit course/faculty feedback (supports anonymous) |
| `GET` | `/feedback/course/{course_id}` | Faculty/Admin | Get feedback for a course |
| `GET` | `/feedback/faculty/{faculty_id}` | Admin | Get feedback for a faculty member |
| `GET` | `/feedback/faculty/{faculty_id}/summary` | Admin/Faculty | Aggregated rating summary |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |

## Kafka Producers

| Function | Topic | Payload |
|----------|-------|---------|
| `publish_grade_submitted` | `grade_submitted` | `{student_id, section_id, grade_points, event}` |
| `publish_assignment_due` | `assignment_due` | `{assignment_id, section_id, event}` |

## Docker Configuration

| Property | Value |
|----------|-------|
| Base Image | `python:3.11-slim` |
| System Packages | `gcc`, `libpq-dev` |
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
kafka-python
python-multipart
motor
chromadb
```
