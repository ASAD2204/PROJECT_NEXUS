# 🤖 GitHub Copilot — Backend Build Instructions
## Project Nexus: Unified Intelligent Campus Platform

> **Instructions for Copilot:** Read this entire file before generating any code.
> Every service follows the exact patterns defined here. Do not deviate from the
> folder structure, naming conventions, or architecture decisions described below.

---

## 📌 Project Context

**Project Nexus** is a university management platform built on a **Polyglot Microservices
Architecture**. The frontend (React + MUI) is already complete and deployed. Your job
is to build the backend: 12 FastAPI microservices, an Nginx API Gateway, and the
supporting infrastructure.

**Core Principle:** Services are fully independent. They do NOT call each other directly.
All cross-service communication happens through **Apache Kafka** (async events) or the
**API Gateway** (sync REST). If a service needs data from another service, it either
listens to a Kafka topic or the frontend calls each service separately through the gateway.

---

## 🗂️ Folder Structure to Create

Create the following structure inside the existing repository root.
The `frontend/` folder already exists — do not touch it.

```
Project_Nexus/
├── frontend/                          ← ALREADY EXISTS — DO NOT MODIFY
│
├── backend/
│   ├── services/
│   │   ├── auth-service/
│   │   ├── sis-service/
│   │   ├── lms-service/
│   │   ├── finance-service/
│   │   ├── attendance-service/
│   │   ├── ai-service/
│   │   ├── chat-service/
│   │   ├── analytics-service/
│   │   ├── hr-service/
│   │   ├── library-service/
│   │   ├── operations-service/
│   │   └── alumni-service/
│   ├── api-gateway/
│   └── shared/
│
├── infrastructure/
│   ├── postgres/
│   ├── mongo/
│   └── kafka/
│
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

---

## 🔁 Standard Service Template (Apply to ALL 12 Services)

Every single microservice must follow this identical internal structure:

```
{service-name}/
├── app/
│   ├── __init__.py          ← empty
│   ├── main.py              ← FastAPI app creation, router registration, CORS
│   ├── config.py            ← Pydantic BaseSettings for env vars
│   ├── database.py          ← SQLAlchemy engine + session (for PG services)
│   ├── models.py            ← SQLAlchemy ORM models
│   ├── schemas.py           ← Pydantic request/response models
│   ├── routes.py            ← All API endpoints (use APIRouter)
│   ├── dependencies.py      ← get_db(), get_current_user(), verify_role()
│   └── kafka_producer.py    ← Only in services that PUBLISH events
│   └── kafka_consumer.py    ← Only in services that CONSUME events
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## 📄 Standard File Templates

### `app/main.py` — Use this pattern for ALL services

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import Base, engine

# Create DB tables on startup (development only)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="{Service Name} - Project Nexus",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "{service-name}"}
```

### `app/config.py` — Use this pattern for ALL services

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
```

### `app/database.py` — Use this pattern for ALL PostgreSQL services

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### `app/dependencies.py` — Use this pattern for ALL services

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

def require_role(required_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker
```

### `Dockerfile` — Use this for ALL Python services

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## 🗄️ PostgreSQL Schema

The following SQL is the complete database schema.
Place this file at `infrastructure/postgres/init.sql`.
Docker will run this automatically on first startup.

```sql
-- ==========================================================
-- PROJECT NEXUS - FINAL DATABASE SCHEMA (v2.0)
-- Polyglot Architecture: PostgreSQL Node
-- ==========================================================

-- 1. Enable UUID Extension (Crucial for User IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- MODULE 1: AUTHENTICATION & SECURITY
-- ==========================================================

-- 1. Central Identity Table
CREATE TABLE auth_users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 2. System Roles
CREATE TABLE auth_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'student', 'faculty', 'admin', 'hod'
    description TEXT
);

-- 3. User-Role Mapping (Many-to-Many)
CREATE TABLE auth_user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    role_id INT REFERENCES auth_roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Granular Permissions
CREATE TABLE auth_permissions (
    perm_id SERIAL PRIMARY KEY,
    role_id INT REFERENCES auth_roles(role_id) ON DELETE CASCADE,
    resource VARCHAR(50), -- e.g., 'grade_book'
    action_slug VARCHAR(50), -- e.g., 'edit', 'view'
    UNIQUE(role_id, resource, action_slug)
);

-- 5. API Keys for External Integrations
CREATE TABLE auth_api_keys (
    key_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    service_name VARCHAR(100), -- e.g., 'Library Kiosk'
    api_key_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP
);

-- ==========================================================
-- MODULE 2: STUDENT INFORMATION SYSTEM (SIS) - Core
-- ==========================================================

-- 6. Departments
CREATE TABLE sis_departments (
    dept_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE, -- e.g., 'CS', 'IT'
    location VARCHAR(100)
);

-- 7. Programs
CREATE TABLE sis_programs (
    program_id SERIAL PRIMARY KEY,
    dept_id INT REFERENCES sis_departments(dept_id),
    title VARCHAR(100), -- e.g., 'BS Information Technology'
    degree_level VARCHAR(20), -- 'BS', 'MS'
    total_semesters INT
);

-- 8. Student Profiles
CREATE TABLE sis_students (
    student_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    program_id INT REFERENCES sis_programs(program_id),
    roll_no VARCHAR(20) UNIQUE NOT NULL,
    cnic VARCHAR(15) UNIQUE,
    dob DATE,
    address TEXT,
    -- AI Field: Stores 'Green', 'Yellow', or 'Red'
    current_risk_status VARCHAR(20) DEFAULT 'Green',
    profile_image_id VARCHAR(100) -- Ref to MongoDB
);

-- 9. Faculty Profiles
CREATE TABLE sis_faculty (
    faculty_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    dept_id INT REFERENCES sis_departments(dept_id),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    designation VARCHAR(50), -- 'Lecturer', 'Professor'
    -- Secure Field: Encrypted salary string
    salary_tier_encrypted TEXT,
    profile_image_id VARCHAR(100) -- Ref to MongoDB
);

-- 10. Semesters
CREATE TABLE sis_semesters (
    semester_id SERIAL PRIMARY KEY,
    title VARCHAR(50), -- e.g., 'Fall 2025'
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE
);

-- 11. Transcripts (Finalized Results)
CREATE TABLE sis_transcripts (
    transcript_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    semester_id INT REFERENCES sis_semesters(semester_id),
    sgpa FLOAT,
    cgpa FLOAT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- MODULE 3: LEARNING MANAGEMENT SYSTEM (LMS)
-- ==========================================================

-- 12. Courses (Master Catalog)
CREATE TABLE lms_courses (
    course_id SERIAL PRIMARY KEY,
    dept_id INT REFERENCES sis_departments(dept_id),
    code VARCHAR(10) UNIQUE, -- e.g., 'CS101'
    title VARCHAR(100),
    credit_hours INT
);

-- 13. Sections (Specific Classes)
CREATE TABLE lms_sections (
    section_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES lms_courses(course_id),
    semester_id INT REFERENCES sis_semesters(semester_id),
    faculty_id INT REFERENCES sis_faculty(faculty_id),
    room_no VARCHAR(20),
    capacity INT
);

-- *SIS ENROLLMENTS (Requires lms_sections to exist)*
-- 14. Enrollments
CREATE TABLE sis_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    section_id INT REFERENCES lms_sections(section_id),
    status VARCHAR(20) DEFAULT 'Enrolled', -- 'Enrolled', 'Withdrawn', 'Dropped'
    final_grade_points FLOAT
);

-- 15. Assignments
CREATE TABLE lms_assignments (
    assignment_id SERIAL PRIMARY KEY,
    section_id INT REFERENCES lms_sections(section_id),
    title VARCHAR(100),
    total_marks INT,
    due_date TIMESTAMP,
    attachment_ref_id VARCHAR(100) -- Ref to MongoDB
);

-- 16. Submissions
CREATE TABLE lms_submissions (
    sub_id SERIAL PRIMARY KEY,
    assignment_id INT REFERENCES lms_assignments(assignment_id),
    student_id INT REFERENCES sis_students(student_id),
    submitted_at TIMESTAMP,
    marks_obtained FLOAT,
    file_ref_id VARCHAR(100) -- Ref to MongoDB
);

-- 17. Quizzes
CREATE TABLE lms_quizzes (
    quiz_id SERIAL PRIMARY KEY,
    section_id INT REFERENCES lms_sections(section_id),
    title VARCHAR(100),
    duration_minutes INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP
);

-- 18. Questions
CREATE TABLE lms_questions (
    question_id SERIAL PRIMARY KEY,
    quiz_id INT REFERENCES lms_quizzes(quiz_id),
    text TEXT NOT NULL,
    question_type VARCHAR(20), -- 'MCQ', 'TrueFalse'
    marks FLOAT
);

-- 19. Answers (Student Attempts)
CREATE TABLE lms_answers (
    answer_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    quiz_id INT REFERENCES lms_quizzes(quiz_id), -- Linking to Quiz for summary
    question_id INT REFERENCES lms_questions(question_id), -- Linking to specific question
    selected_option TEXT,
    score_obtained FLOAT
);

-- 20. Attendance (Smart Attendance Logs)
CREATE TABLE lms_attendance (
    attendance_id SERIAL PRIMARY KEY,
    section_id INT REFERENCES lms_sections(section_id),
    student_id INT REFERENCES sis_students(student_id),
    date DATE NOT NULL,
    status VARCHAR(10) CHECK (status IN ('Present', 'Absent', 'Leave', 'Late')),
    check_in_time TIME,
    gps_lat FLOAT, -- Geofencing Data
    gps_long FLOAT, -- Geofencing Data
    is_biometric_verified BOOLEAN DEFAULT TRUE
);

-- 21. Timetable Slots (Constraint Logic)
CREATE TABLE lms_timetable_slots (
    slot_id SERIAL PRIMARY KEY,
    section_id INT REFERENCES lms_sections(section_id),
    day_of_week VARCHAR(10), -- 'Monday', 'Tuesday'
    start_time TIME,
    end_time TIME,
    room_no VARCHAR(20)
);

-- ==========================================================
-- MODULE 4: FINANCIAL & BILLING
-- ==========================================================

-- 22. Fee Heads (Structure)
CREATE TABLE fin_fee_heads (
    head_id SERIAL PRIMARY KEY,
    title VARCHAR(100), -- 'Tuition', 'Transport', 'Lab'
    default_amount DECIMAL(10, 2)
);

-- 23. Invoices (Master Table)
CREATE TABLE fin_invoices (
    invoice_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    semester_id INT REFERENCES sis_semesters(semester_id),
    total_amount DECIMAL(10, 2),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'Unpaid' -- 'Paid', 'Unpaid', 'Overdue'
);

-- 24. Invoice Items (Detail Table)
CREATE TABLE fin_invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES fin_invoices(invoice_id),
    head_id INT REFERENCES fin_fee_heads(head_id),
    amount DECIMAL(10, 2)
);

-- 25. Transactions (Payment Gateway Logs)
CREATE TABLE fin_transactions (
    trx_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES fin_invoices(invoice_id),
    gateway_ref VARCHAR(100), -- Stripe/JazzCash ID
    amount_paid DECIMAL(10, 2),
    trx_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(20) -- 'Stripe', 'JazzCash', 'BankChallan'
);

-- 26. Fines
CREATE TABLE fin_fines (
    fine_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES fin_invoices(invoice_id),
    days_overdue INT,
    fine_amount DECIMAL(10, 2),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- MODULE 5: LIBRARY & OPERATIONS
-- ==========================================================

-- 27. Library Books
CREATE TABLE lib_books (
    book_id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(200),
    author VARCHAR(100),
    total_copies INT,
    available_copies INT,
    shelf_location VARCHAR(50)
);

-- 28. Book Issues
CREATE TABLE lib_issues (
    issue_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    book_id INT REFERENCES lib_books(book_id),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'Issued' -- 'Issued', 'Returned', 'Lost'
);

-- 29. Leaves (Staff/Faculty)
CREATE TABLE ops_leaves (
    leave_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id),
    leave_type VARCHAR(50), -- 'Sick', 'Casual'
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending' -- 'Pending', 'Approved', 'Rejected'
);

-- 30. Grievances (Help Desk)
CREATE TABLE ops_grievances (
    ticket_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    category VARCHAR(50), -- 'Academic', 'Facilities', 'Harassment'
    description TEXT,
    status VARCHAR(20) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 31. Alumni Registry
CREATE TABLE alumni_registry (
    alumni_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    grad_year INT,
    current_employer VARCHAR(100),
    linkedin_url VARCHAR(255)
);

-- 32. Alumni Jobs
CREATE TABLE alumni_jobs (
    job_id SERIAL PRIMARY KEY,
    alumni_id INT REFERENCES alumni_registry(alumni_id),
    title VARCHAR(100),
    company VARCHAR(100),
    description TEXT,
    apply_link VARCHAR(255),
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================================
-- SEED DATA: Default Roles
-- ==========================================================
INSERT INTO auth_roles (role_name, description) VALUES
    ('student',   'Student user'),
    ('faculty',   'Faculty member'),
    ('admin',     'System administrator'),
    ('hod',       'Head of Department'),
    ('librarian', 'Library staff'),
    ('alumni',    'Alumni member');
```

---

## 🌐 Service-by-Service Build Instructions

### 1. `auth-service` — Build This FIRST

**Port:** 8001 | **DB:** PostgreSQL | **Cache:** Redis

**`requirements.txt`:**
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

**`app/models.py`:** Map `auth_users`, `auth_roles`, `auth_user_roles`, `auth_permissions`.

**`app/routes.py` — Required Endpoints:**
```
POST   /api/v1/auth/register        → Create user + assign role
POST   /api/v1/auth/login           → Verify password, return JWT
POST   /api/v1/auth/logout          → Invalidate session in Redis
GET    /api/v1/auth/me              → Return current user profile (Protected)
POST   /api/v1/auth/refresh         → Refresh JWT token
POST   /api/v1/auth/forgot-password → Send OTP to email
POST   /api/v1/auth/verify-otp      → Verify OTP, return reset token
POST   /api/v1/auth/reset-password  → Reset with new password
```

**JWT Payload must contain:**
```python
{
    "sub": str(user.user_id),   # UUID as string
    "role": role_name,           # e.g., "student"
    "email": user.email,
    "exp": expiry_datetime
}
```

**Login Logic:**
1. Query `auth_users` by email
2. Verify password with `passlib.bcrypt`
3. Get role from `auth_user_roles` JOIN `auth_roles`
4. Create JWT with payload above
5. Store `session:{user_id}` in Redis with 3600s TTL
6. Update `last_login` in `auth_users`
7. Return `{"access_token": token, "token_type": "bearer", "role": role_name}`

**Registration Logic:**
1. Hash password with bcrypt (12 rounds)
2. Insert into `auth_users`
3. Get `role_id` from `auth_roles` where `role_name = requested_role`
4. Insert into `auth_user_roles`
5. For student role: also INSERT into `sis_students` with basic data
6. For faculty role: also INSERT into `sis_faculty` with basic data

---

### 2. `sis-service` — Student Information System

**Port:** 8002 | **DB:** PostgreSQL

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
reportlab
```

**`app/models.py`:** Map `sis_students`, `sis_faculty`, `sis_departments`, `sis_programs`, `sis_semesters`, `sis_transcripts`, `sis_enrollments`.

**`app/routes.py` — Required Endpoints:**
```
# Students
GET    /api/v1/sis/students                    → List all students (admin only)
GET    /api/v1/sis/students/{student_id}       → Get student profile
PUT    /api/v1/sis/students/{student_id}       → Update student profile
GET    /api/v1/sis/students/me                 → Get own profile (student role)

# Enrollment
POST   /api/v1/sis/enrollments                 → Register for courses
GET    /api/v1/sis/enrollments/me              → Get my enrolled courses
DELETE /api/v1/sis/enrollments/{id}            → Drop a course

# Transcripts
GET    /api/v1/sis/transcripts/me              → Get my full transcript
GET    /api/v1/sis/transcripts/me/pdf          → Download transcript as PDF
                                                  (Block if fin_invoices has 'Unpaid')

# Semesters
GET    /api/v1/sis/semesters                   → List all semesters
GET    /api/v1/sis/semesters/active            → Get current active semester

# Departments & Programs
GET    /api/v1/sis/departments                 → List departments
GET    /api/v1/sis/programs                    → List programs

# Faculty (admin only)
GET    /api/v1/sis/faculty                     → List faculty
POST   /api/v1/sis/faculty                     → Create faculty profile
PUT    /api/v1/sis/faculty/{faculty_id}        → Update faculty
```

**Transcript PDF Logic:**
1. Check `fin_invoices` — if any record has `status = 'Unpaid'`, return `HTTP 403` with message `"Please clear dues to access transcript."`
2. Otherwise, query all `sis_transcripts` for the student joined with `sis_semesters`
3. Use `reportlab` to generate a PDF with university header, student info, and grade table
4. Return as `StreamingResponse` with `media_type="application/pdf"`

**Kafka Consumer:** Listen to topic `grade_submitted`.
When consumed: Update `sis_transcripts` (insert or update `sgpa`), then recalculate `cgpa` as the average of all semester SGPAs.

---

### 3. `lms-service` — Learning Management System

**Port:** 8003 | **DB:** PostgreSQL | **Kafka:** Producer

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
kafka-python
python-multipart
```

**`app/models.py`:** Map `lms_courses`, `lms_sections`, `lms_assignments`, `lms_submissions`, `lms_quizzes`, `lms_questions`, `lms_answers`, `lms_attendance`, `lms_timetable_slots`.

**`app/routes.py` — Required Endpoints:**
```
# Courses
GET    /api/v1/lms/courses                         → List all courses
POST   /api/v1/lms/courses                         → Create course (admin)
GET    /api/v1/lms/courses/my-courses              → Faculty's assigned sections

# Sections
POST   /api/v1/lms/sections                        → Create section (admin)
GET    /api/v1/lms/sections/{section_id}           → Section details

# Assignments
GET    /api/v1/lms/assignments/section/{id}        → Get assignments for a section
POST   /api/v1/lms/assignments                     → Create assignment (faculty)
PUT    /api/v1/lms/assignments/{id}                → Update assignment
DELETE /api/v1/lms/assignments/{id}                → Delete assignment

# Submissions
POST   /api/v1/lms/submissions                     → Submit assignment (student)
                                                     Block if current time > due_date
GET    /api/v1/lms/submissions/assignment/{id}     → View all submissions (faculty)
PUT    /api/v1/lms/submissions/{id}/grade          → Grade a submission
                                                     On grade save → publish Kafka event

# Quizzes
POST   /api/v1/lms/quizzes                         → Create quiz with questions
GET    /api/v1/lms/quizzes/section/{id}            → Get quizzes for section
POST   /api/v1/lms/quizzes/{id}/attempt            → Submit quiz attempt (student)
                                                     Auto-grade MCQs, save to lms_answers

# Grades — Final Grade Submission
POST   /api/v1/lms/grades/submit                   → Faculty submits final grades
                                                     → Publish to Kafka topic: grade_submitted

# Timetable
POST   /api/v1/lms/timetable                       → Create timetable slot
GET    /api/v1/lms/timetable/section/{id}          → Get section timetable
```

**`app/kafka_producer.py`:**
```python
from kafka import KafkaProducer
import json
from app.config import settings

producer = KafkaProducer(
    bootstrap_servers=settings.KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def publish_grade_submitted(student_id: int, section_id: int, grade_points: float):
    producer.send('grade_submitted', {
        "student_id": student_id,
        "section_id": section_id,
        "grade_points": grade_points,
        "event": "GRADE_SUBMITTED"
    })
    producer.flush()

def publish_assignment_due(assignment_id: int, section_id: int):
    producer.send('assignment_due', {
        "assignment_id": assignment_id,
        "section_id": section_id,
        "event": "ASSIGNMENT_DUE"
    })
    producer.flush()
```

---

### 4. `finance-service` — Fee & Payment Management

**Port:** 8004 | **DB:** PostgreSQL | **Kafka:** Consumer

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
kafka-python
stripe
```

**`app/routes.py` — Required Endpoints:**
```
# Invoices
GET    /api/v1/finance/invoices/me                 → Student views own invoices
GET    /api/v1/finance/invoices/{student_id}       → Admin views student invoices
POST   /api/v1/finance/invoices/generate           → Admin generates invoices for semester
                                                     Calculates: credit_hours × rate + fixed fees

# Payments
POST   /api/v1/finance/payments/initiate           → Create Stripe PaymentIntent
                                                     Returns: {client_secret}
POST   /api/v1/finance/payments/webhook            → Stripe webhook (mark invoice Paid)
                                                     → Publish Kafka event: payment_processed
GET    /api/v1/finance/payments/history            → Student payment history

# Fee Heads (Admin)
GET    /api/v1/finance/fee-heads                   → List all fee heads
POST   /api/v1/finance/fee-heads                   → Create fee head
PUT    /api/v1/finance/fee-heads/{id}              → Update fee head

# Fines
GET    /api/v1/finance/fines/me                    → Student's fines
POST   /api/v1/finance/fines/apply                 → Cron: apply 5% late fee (daily)
```

**Late Fee Logic (Cron-style endpoint):**
```python
# Called by a scheduler (APScheduler inside service) daily at 00:00 UTC
# Query all fin_invoices where status='Unpaid' AND due_date < today
# For each: calculate fine = total_amount * 0.05
# Insert into fin_fines
# Update fin_invoices.status = 'Overdue'
```

---

### 5. `attendance-service` — Biometric Attendance

**Port:** 8005 | **DB:** PostgreSQL | **VectorDB:** ChromaDB | **Cache:** Redis

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
chromadb
face-recognition
opencv-python-headless
numpy
redis
```

**`app/routes.py` — Required Endpoints:**
```
# Attendance Marking (Multi-Step Flow)
POST   /api/v1/attendance/verify-gps               → Step 1: Validate GPS coords
                                                     Check: distance from campus < 100m
                                                     Return: {gps_verified: true/false}

POST   /api/v1/attendance/verify-liveness          → Step 2: Check liveness from video frame
                                                     Use OpenCV to detect blink/motion
                                                     Return: {liveness_verified: true/false}

POST   /api/v1/attendance/verify-face              → Step 3: Match face to student profile
                                                     Query ChromaDB vectors_face_biometrics
                                                     Euclidean distance < 0.6 = match
                                                     If all 3 pass → INSERT into lms_attendance
                                                     Return: {attendance_marked: true, timestamp}

# Face Enrollment
POST   /api/v1/attendance/enroll-face/{student_id} → Admin enrolls student face
                                                     Extract 128D embedding, store in ChromaDB

# Attendance Records
GET    /api/v1/attendance/section/{section_id}     → Faculty: get attendance for class
GET    /api/v1/attendance/me                       → Student: get own attendance history
PUT    /api/v1/attendance/{id}                     → Faculty: manual override
```

**GPS Verification Logic:**
```python
import math

CAMPUS_LAT = 32.0853   # University of Punjab Gujranwala coordinates
CAMPUS_LNG = 74.1894
MAX_RADIUS_METERS = 100

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def is_on_campus(student_lat: float, student_lng: float) -> bool:
    distance = haversine_distance(CAMPUS_LAT, CAMPUS_LNG, student_lat, student_lng)
    return distance <= MAX_RADIUS_METERS
```

---

### 6. `ai-service` — Hybrid CAG+RAG Chatbot

**Port:** 8006 | **VectorDB:** ChromaDB | **Cache:** Redis | **External:** Google Gemini API

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
pydantic-settings
python-jose[cryptography]
chromadb
langchain
langchain-google-genai
google-generativeai
redis
```

**`app/routes.py` — Required Endpoints:**
```
POST   /api/v1/ai/chat                → Main chat endpoint
                                        Body: {query: str, session_id: str}
                                        1. Check Redis CAG cache for static queries
                                        2. If not cached → run RAG pipeline
                                        3. Save message to MongoDB (chat_messages)
                                        4. Return streamed response

GET    /api/v1/ai/chat/history        → Get chat history for current user

POST   /api/v1/ai/embed-document      → Admin: add document to ChromaDB
                                        Body: {document: str, collection: str, metadata: dict}

DELETE /api/v1/ai/chat/history        → Clear chat history (flush Redis session)
```

**`app/rag_pipeline.py`:**
```python
import google.generativeai as genai
import chromadb
import redis
from app.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
chroma_client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=8000)
redis_client = redis.Redis.from_url(settings.REDIS_URL)

STATIC_FAQ_COLLECTIONS = ["vectors_faq_knowledge", "vectors_university_policies"]
DYNAMIC_COLLECTIONS = ["vectors_student_transcripts", "vectors_course_materials"]

def answer_query(query: str, user_id: str, role: str) -> str:
    # Step 1: Check CAG cache
    cache_key = f"cag:{hash(query)}"
    cached = redis_client.get(cache_key)
    if cached:
        return cached.decode()

    # Step 2: Semantic search in ChromaDB
    embedding_model = genai.embed_content(
        model="models/text-embedding-004",
        content=query,
        task_type="retrieval_query"
    )
    query_vector = embedding_model["embedding"]

    context_chunks = []
    collections_to_search = STATIC_FAQ_COLLECTIONS + (DYNAMIC_COLLECTIONS if role == "student" else [])

    for coll_name in collections_to_search:
        try:
            collection = chroma_client.get_collection(coll_name)
            results = collection.query(query_embeddings=[query_vector], n_results=3,
                                       where={"student_id": int(user_id)} if "transcript" in coll_name else None)
            context_chunks.extend(results["documents"][0])
        except Exception:
            continue

    context = "\n\n".join(context_chunks)

    # Step 3: Generate response with Gemini
    system_prompt = f"""You are the official AI assistant for Project Nexus University Management System.
    You are helping a {role}. Only answer based on the context provided.
    If confidence is low, say: 'I don't have enough information. Please contact the admin office.'
    NEVER reveal data of other users.

    Context:
    {context}
    """

    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content([system_prompt, query])
    answer = response.text

    # Step 4: Cache static answers
    if any(kw in query.lower() for kw in ["policy", "deadline", "holiday", "exam date", "fee structure"]):
        redis_client.setex(cache_key, 3600, answer)

    return answer
```

---

### 7. `chat-service` — Real-Time P2P WebSocket Chat

**Port:** 8007 | **DB:** MongoDB | **Cache:** Redis

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
pydantic-settings
python-jose[cryptography]
motor           ← async MongoDB driver
redis
```

**`app/routes.py` — Required Endpoints:**
```
GET    /api/v1/chat/conversations          → List user's conversations
GET    /api/v1/chat/messages/{session_id}  → Get message history for a session
POST   /api/v1/chat/sessions               → Start a new 1-to-1 session
WS     /api/v1/chat/ws/{session_id}        → WebSocket endpoint for real-time messaging
```

**`app/websocket_manager.py`:**
```python
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # session_id → list of connected WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)

    async def broadcast(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_json(message)

manager = ConnectionManager()
```

**WebSocket Endpoint Logic:**
```python
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            # 1. Save message to MongoDB (chat_messages collection)
            # 2. Check if recipient is online via Redis key: chat:online:{user_id}
            # 3. If online → broadcast to session
            # 4. If offline → queue in Redis: notifications:{user_id}
            await manager.broadcast(data, session_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
```

---

### 8. `analytics-service` — At-Risk Prediction & Dashboards

**Port:** 8008 | **DB:** PostgreSQL | **Kafka:** Consumer

**`requirements.txt`:**
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
```

**`app/routes.py` — Required Endpoints:**
```
GET    /api/v1/analytics/at-risk/section/{id}   → Faculty: get at-risk students for section
GET    /api/v1/analytics/dashboard/admin        → Admin: KPIs (total students, revenue, attendance %)
GET    /api/v1/analytics/dashboard/faculty      → Faculty: class performance summary
GET    /api/v1/analytics/student/{id}/risk      → Get risk score for specific student
POST   /api/v1/analytics/model/train            → Admin: retrain ML model (manual trigger)
```

**`app/ml_model.py`:**
```python
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib, os

MODEL_PATH = "app/risk_model.pkl"

def train_model(training_data: list):
    """
    training_data: list of dicts with keys:
    - attendance_pct: float (0-100)
    - avg_quiz_score: float (0-100)
    - assignment_submission_rate: float (0-1)
    - cgpa: float (0-4)
    - label: str ('Green', 'Yellow', 'Red')
    """
    df = pd.DataFrame(training_data)
    X = df[["attendance_pct", "avg_quiz_score", "assignment_submission_rate", "cgpa"]]
    le = LabelEncoder()
    y = le.fit_transform(df["label"])

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    joblib.dump((model, le), MODEL_PATH)
    return {"status": "Model trained", "samples": len(df)}

def predict_risk(attendance_pct: float, avg_quiz_score: float,
                 submission_rate: float, cgpa: float) -> str:
    if not os.path.exists(MODEL_PATH):
        # Rule-based fallback if model not trained yet
        if attendance_pct < 75 or cgpa < 2.0:
            return "Red"
        elif attendance_pct < 85 or cgpa < 2.8:
            return "Yellow"
        return "Green"

    model, le = joblib.load(MODEL_PATH)
    features = [[attendance_pct, avg_quiz_score, submission_rate, cgpa]]
    prediction = model.predict(features)[0]
    return le.inverse_transform([prediction])[0]
```

---

### 9. `hr-service` — Leave & Employee Management

**Port:** 8009 | **DB:** PostgreSQL

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
```

**`app/routes.py` — Required Endpoints:**
```
# Leave Management
POST   /api/v1/hr/leaves/apply                  → Faculty/Staff applies for leave
GET    /api/v1/hr/leaves/me                     → View my leave history and balance
GET    /api/v1/hr/leaves/pending                → HOD: view pending requests
PUT    /api/v1/hr/leaves/{leave_id}/approve     → HOD: approve leave
PUT    /api/v1/hr/leaves/{leave_id}/reject      → HOD: reject leave with reason

# Employee Profiles
GET    /api/v1/hr/employees                     → Admin: list all employees
GET    /api/v1/hr/employees/{faculty_id}        → Get employee profile
PUT    /api/v1/hr/employees/{faculty_id}        → Update employee (salary encrypted with AES-256)
```

**Leave Validation:**
- `Casual Leave` quota: 20 days/year. Block if balance = 0.
- Auto-route: if applicant is HOD → route to Director (admin role).
- After approval: do NOT deduct days immediately — deduct when `start_date` is reached (use a scheduled check).

---

### 10. `library-service` — Books & Issuance

**Port:** 8010 | **DB:** PostgreSQL

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
qrcode
Pillow
```

**`app/routes.py` — Required Endpoints:**
```
# Catalog
GET    /api/v1/library/books                    → Search books (query params: title, author, isbn)
GET    /api/v1/library/books/{book_id}          → Book details with live availability

# Issuance (Librarian only)
POST   /api/v1/library/issues                   → Issue book to student
                                                  Block if student has ≥ 3 active issues
                                                  Set due_date = issue_date + 14 days
POST   /api/v1/library/returns/{issue_id}       → Return book
                                                  If overdue: calculate fine, post to fin_fines
                                                  Update lib_books.available_copies += 1

# Student
GET    /api/v1/library/issues/me                → Student: view issued books
GET    /api/v1/library/qr/{student_id}          → Generate QR code PNG for student ID

# Admin
POST   /api/v1/library/books                    → Add book to catalog
PUT    /api/v1/library/books/{book_id}          → Update book info
```

**Fine Calculation on Return:**
```python
from datetime import date, timedelta

FINE_PER_DAY = 50  # PKR 50 per day

def calculate_fine(due_date: date, return_date: date) -> float:
    if return_date <= due_date:
        return 0.0
    days_overdue = (return_date - due_date).days
    return min(days_overdue * FINE_PER_DAY, REPLACEMENT_COST)
```

---

### 11. `operations-service` — Grievances & Announcements

**Port:** 8011 | **DB:** PostgreSQL | **MongoDB:** content_announcements | **External:** Gemini (for NLP)

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
motor
google-generativeai
```

**`app/routes.py` — Required Endpoints:**
```
# Grievances
POST   /api/v1/ops/grievances                   → Student submits complaint
                                                  NLP: detect sentiment + auto-route to dept
GET    /api/v1/ops/grievances/me                → Student: track own tickets
GET    /api/v1/ops/grievances                   → Admin: view all tickets
PUT    /api/v1/ops/grievances/{id}/status       → Admin/Dept: update status
                                                  If 'High Priority' + > 48hrs → auto-escalate

# Announcements
POST   /api/v1/ops/announcements                → Admin/Incharge posts announcement
                                                  target_audience: ['student', 'faculty', 'all']
GET    /api/v1/ops/announcements                → Get announcements for current user's role
DELETE /api/v1/ops/announcements/{id}           → Delete announcement (admin)
```

**Grievance NLP Routing Logic:**
```python
import google.generativeai as genai

ROUTING_MAP = {
    "wifi": "IT Department",
    "internet": "IT Department",
    "cleanliness": "Estate Department",
    "harassment": "Student Affairs (URGENT)",
    "grade": "Examination Department",
    "fee": "Finance Department",
    "library": "Library Department",
}

def route_grievance(description: str) -> dict:
    description_lower = description.lower()
    # Simple keyword routing first
    for keyword, dept in ROUTING_MAP.items():
        if keyword in description_lower:
            return {"department": dept, "is_urgent": "URGENT" in dept}
    # Fallback: use Gemini to classify
    model = genai.GenerativeModel("gemini-pro")
    prompt = f"""Classify this university complaint into one of these departments:
    IT Department, Finance Department, Academic Department, Student Affairs, Estate Department, Library Department.
    Also determine if it is URGENT (yes/no).
    Complaint: {description}
    Respond in JSON format: {{"department": "...", "is_urgent": true/false}}"""
    response = model.generate_content(prompt)
    import json
    return json.loads(response.text)
```

---

### 12. `alumni-service` — Alumni Network & Jobs

**Port:** 8012 | **DB:** PostgreSQL

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
```

**`app/routes.py` — Required Endpoints:**
```
# Alumni Registration
POST   /api/v1/alumni/register                  → Graduate registers as alumni
                                                  Verify: check sis_students.status = 'Graduated'

# Network
GET    /api/v1/alumni/directory                 → Browse alumni network
GET    /api/v1/alumni/{alumni_id}               → View alumni profile

# Job Board
GET    /api/v1/alumni/jobs                      → List active job postings
POST   /api/v1/alumni/jobs                      → Alumni posts a job
                                                  Set status = 'Pending' for admin approval
PUT    /api/v1/alumni/jobs/{job_id}/approve     → Admin approves job post
```

---

## 🌐 API Gateway (Nginx)

**File:** `backend/api-gateway/nginx.conf`

```nginx
upstream auth_service    { server auth-service:8000; }
upstream sis_service     { server sis-service:8000; }
upstream lms_service     { server lms-service:8000; }
upstream finance_service { server finance-service:8000; }
upstream attendance_service { server attendance-service:8000; }
upstream ai_service      { server ai-service:8000; }
upstream chat_service    { server chat-service:8000; }
upstream analytics_service { server analytics-service:8000; }
upstream hr_service      { server hr-service:8000; }
upstream library_service { server library-service:8000; }
upstream operations_service { server operations-service:8000; }
upstream alumni_service  { server alumni-service:8000; }

server {
    listen 80;

    # Route by URL prefix to correct service
    location /api/v1/auth/        { proxy_pass http://auth_service; }
    location /api/v1/sis/         { proxy_pass http://sis_service; }
    location /api/v1/lms/         { proxy_pass http://lms_service; }
    location /api/v1/finance/     { proxy_pass http://finance_service; }
    location /api/v1/attendance/  { proxy_pass http://attendance_service; }
    location /api/v1/ai/          { proxy_pass http://ai_service; }
    location /api/v1/chat/        { proxy_pass http://chat_service; }
    location /api/v1/analytics/   { proxy_pass http://analytics_service; }
    location /api/v1/hr/          { proxy_pass http://hr_service; }
    location /api/v1/library/     { proxy_pass http://library_service; }
    location /api/v1/ops/         { proxy_pass http://operations_service; }
    location /api/v1/alumni/      { proxy_pass http://alumni_service; }

    # WebSocket support for chat
    location /api/v1/chat/ws {
        proxy_pass http://chat_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

---

## 🐳 `docker-compose.yml` (Root Level)

```yaml
version: '3.8'

networks:
  nexus-network:
    driver: bridge

volumes:
  postgres_data:
  mongo_data:
  redis_data:
  chroma_data:

services:

  # ─── INFRASTRUCTURE ───────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    container_name: nexus-postgres
    environment:
      POSTGRES_DB: nexus_db
      POSTGRES_USER: nexus_user
      POSTGRES_PASSWORD: nexus_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks: [nexus-network]
    ports: ["5432:5432"]

  mongodb:
    image: mongo:6-jammy
    container_name: nexus-mongo
    volumes:
      - mongo_data:/data/db
    networks: [nexus-network]
    ports: ["27017:27017"]

  redis:
    image: redis:7-alpine
    container_name: nexus-redis
    volumes:
      - redis_data:/data
    networks: [nexus-network]
    ports: ["6379:6379"]

  chromadb:
    image: chromadb/chroma:latest
    container_name: nexus-chroma
    volumes:
      - chroma_data:/chroma/chroma
    networks: [nexus-network]
    ports: ["8000:8000"]

  zookeeper:
    image: bitnami/zookeeper:latest
    container_name: nexus-zookeeper
    environment:
      ALLOW_ANONYMOUS_LOGIN: "yes"
    networks: [nexus-network]

  kafka:
    image: bitnami/kafka:latest
    container_name: nexus-kafka
    environment:
      KAFKA_CFG_ZOOKEEPER_CONNECT: zookeeper:2181
      ALLOW_PLAINTEXT_LISTENER: "yes"
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092
      KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    depends_on: [zookeeper]
    networks: [nexus-network]
    ports: ["9092:9092"]

  # ─── API GATEWAY ──────────────────────────────────────────
  api-gateway:
    build: ./backend/api-gateway
    container_name: nexus-gateway
    ports: ["80:80"]
    depends_on:
      - auth-service
      - sis-service
      - lms-service
    networks: [nexus-network]

  # ─── MICROSERVICES ────────────────────────────────────────
  auth-service:
    build: ./backend/services/auth-service
    container_name: nexus-auth
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, redis]
    networks: [nexus-network]

  sis-service:
    build: ./backend/services/sis-service
    container_name: nexus-sis
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      KAFKA_BROKER: kafka:9092
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, kafka]
    networks: [nexus-network]

  lms-service:
    build: ./backend/services/lms-service
    container_name: nexus-lms
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      KAFKA_BROKER: kafka:9092
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, kafka]
    networks: [nexus-network]

  finance-service:
    build: ./backend/services/finance-service
    container_name: nexus-finance
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      KAFKA_BROKER: kafka:9092
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, kafka]
    networks: [nexus-network]

  attendance-service:
    build: ./backend/services/attendance-service
    container_name: nexus-attendance
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      CHROMA_HOST: chromadb
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, chromadb, redis]
    networks: [nexus-network]

  ai-service:
    build: ./backend/services/ai-service
    container_name: nexus-ai
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      CHROMA_HOST: chromadb
      REDIS_URL: redis://redis:6379
      MONGO_URL: mongodb://mongodb:27017/nexus_chat
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [chromadb, redis, mongodb]
    networks: [nexus-network]

  chat-service:
    build: ./backend/services/chat-service
    container_name: nexus-chat
    environment:
      MONGO_URL: mongodb://mongodb:27017/nexus_chat
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [mongodb, redis]
    networks: [nexus-network]

  analytics-service:
    build: ./backend/services/analytics-service
    container_name: nexus-analytics
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      KAFKA_BROKER: kafka:9092
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, kafka]
    networks: [nexus-network]

  hr-service:
    build: ./backend/services/hr-service
    container_name: nexus-hr
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres]
    networks: [nexus-network]

  library-service:
    build: ./backend/services/library-service
    container_name: nexus-library
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres]
    networks: [nexus-network]

  operations-service:
    build: ./backend/services/operations-service
    container_name: nexus-operations
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      MONGO_URL: mongodb://mongodb:27017/nexus_ops
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, mongodb]
    networks: [nexus-network]

  alumni-service:
    build: ./backend/services/alumni-service
    container_name: nexus-alumni
    environment:
      DATABASE_URL: postgresql://nexus_user:nexus_pass@postgres:5432/nexus_db
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres]
    networks: [nexus-network]

  # ─── FRONTEND ─────────────────────────────────────────────
  frontend:
    build: ./frontend
    container_name: nexus-frontend
    ports: ["3000:80"]
    networks: [nexus-network]
```

---

## 📨 Kafka Topics Reference

```
Topic Name              | Producer          | Consumer(s)
─────────────────────────────────────────────────────────────
grade_submitted         | lms-service       | sis-service, analytics-service
payment_processed       | finance-service   | sis-service, operations-service
attendance_marked       | attendance-service| analytics-service
assignment_due          | lms-service       | operations-service (notifications)
leave_approved          | hr-service        | operations-service (notifications)
global_announcement     | operations-service| all services (broadcast)
at_risk_flagged         | analytics-service | operations-service (notifications)
```

---

## 🔑 `.env.example` (Root Level)

```env
# Database
POSTGRES_DB=nexus_db
POSTGRES_USER=nexus_user
POSTGRES_PASSWORD=nexus_pass

# Security
JWT_SECRET=change-this-to-a-long-random-string-minimum-32-chars

# External APIs
GEMINI_API_KEY=your-google-gemini-api-key
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Infrastructure
REDIS_URL=redis://redis:6379
KAFKA_BROKER=kafka:9092
MONGO_URL=mongodb://mongodb:27017
CHROMA_HOST=chromadb
```

---

## ✅ Build Priority Order

Build services in this exact order. Each service depends on the ones before it being stable.

| Priority | Service | Reason |
|----------|---------|--------|
| 1 | `auth-service` | Everything depends on JWT |
| 2 | `sis-service` | Core student/faculty data |
| 3 | `lms-service` | Core academic data + first Kafka producer |
| 4 | `finance-service` | Tests payment flow + Kafka consumer |
| 5 | `hr-service` | Simple CRUD, no dependencies |
| 6 | `library-service` | Simple CRUD, no dependencies |
| 7 | `operations-service` | Depends on MongoDB + Gemini |
| 8 | `alumni-service` | Depends on sis_students data |
| 9 | `analytics-service` | Depends on lms + sis data |
| 10 | `chat-service` | WebSocket + MongoDB |
| 11 | `attendance-service` | Computer vision — most complex |
| 12 | `ai-service` | RAG pipeline — most complex |

---

## 🧪 Testing Each Service

After building each service, test it with this pattern:

```bash
# 1. Start just the service + its dependencies
docker-compose up postgres redis kafka auth-service

# 2. Open Swagger UI at:
http://localhost:8001/docs   # auth-service
http://localhost:8002/docs   # sis-service
# ... etc

# 3. Test the health endpoint first:
curl http://localhost:8001/health
# Expected: {"status": "ok", "service": "auth-service"}

# 4. Test auth flow:
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@nexus.edu","password":"student123","role":"student"}'
```

---

*End of Copilot Instructions — Project Nexus Backend v2.0*