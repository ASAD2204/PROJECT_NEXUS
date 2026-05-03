# Attendance Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> **Biometric Attendance microservice for Project Nexus**

## Overview

The Attendance Service implements a 3-step biometric attendance flow: GPS geofencing → liveness detection (EAR blink + voice challenge) → face verification via ChromaDB embeddings. It supports multi-photo face enrollment with image augmentation, caches attendance status in Redis, and publishes events to Kafka.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **PostgreSQL** | Attendance records (SQLAlchemy ORM) |
| **Redis** | Attendance status cache and auth session validation |
| **ChromaDB** | Face embedding vector store (128-D, cosine distance) |
| **Kafka** | Event producer (attendance_marked) |
| **face_recognition** | 128-D face encoding (optional, graceful fallback) |
| **OpenCV** | Image processing, CLAHE enhancement |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
attendance-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py            # Settings & environment variables
    ├── database.py          # PostgreSQL + Redis connections
    ├── dependencies.py      # JWT + Redis session auth & role guard
    ├── gps_utils.py         # Haversine distance + geofence check
    ├── image_utils.py       # CLAHE, EAR blink, voice, face encoding
    ├── kafka_producer.py    # Kafka event publisher
    ├── main.py              # FastAPI app entrypoint
    ├── models.py            # SQLAlchemy ORM models
    ├── routes.py            # All API endpoints (11 routes)
    └── schemas.py           # Pydantic request/response schemas
```

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | `str` | *required* | PostgreSQL connection string |
| `REDIS_URL` | `str` | `redis://redis:6379` | Redis connection string |
| `KAFKA_BROKER` | `str` | `kafka:9092` | Kafka broker address |
| `CHROMA_HOST` | `str` | `chromadb` | ChromaDB hostname |
| `CHROMA_PORT` | `int` | `8000` | ChromaDB port |
| `JWT_SECRET` | `str` | *required* | Secret key for JWT signing |
| `JWT_ALGORITHM` | `str` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `int` | `60` | Token expiry in minutes |
| `CAMPUS_LAT` | `float` | `32.0853` | Campus center latitude |
| `CAMPUS_LNG` | `float` | `74.1894` | Campus center longitude |
| `MAX_RADIUS_METERS` | `int` | `100` | GPS geofence radius in meters |

## Database Models

### `Attendance` — table `lms_attendance`
| Column | Type | Constraints |
|--------|------|-------------|
| `attendance_id` | Integer | PK, autoincrement |
| `section_id` | Integer | FK → lms_sections.section_id, NOT NULL |
| `student_id` | Integer | NOT NULL |
| `date` | Date | NOT NULL |
| `status` | String(10) | CHECK (Present, Absent, Leave, Late) |
| `check_in_time` | Time | nullable |
| `gps_lat` | Float | nullable |
| `gps_long` | Float | nullable |
| `is_biometric_verified` | Boolean | default True |

### Cross-Service Mirrors (read-only)
- `Section` — table `lms_sections`
- `Student` — table `sis_students`

## Redis Usage

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `attend:{student_id}:{date}` | 24 hours | Attendance status cache (value: "PRESENT") |
| `session:{user_id}` | 1 hour | Active auth session JSON used to validate protected requests |

## ChromaDB Collections

| Collection | Distance Metric | Description |
|------------|----------------|-------------|
| `vectors_face_biometrics` | Cosine (HNSW) | 128-D face embeddings for verification (threshold: distance < 0.6) |

## 3-Step Biometric Attendance Flow

```
Step 1: GPS Verification ──→ Step 2a: EAR Blink Detection ──→ Step 3: Face Verification
                               │                                    │
                               └──→ Step 2b: Voice Challenge        ├── Mark Attendance
                                    (fallback)                      ├── Cache in Redis
                                                                    └── Publish Kafka Event
```

## API Endpoints

All endpoints are prefixed with `/api/v1/attendance`.

### Biometric Flow & Management
| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 1 | `POST` | `/verify-gps` | Yes | Any | **Step 1:** Check if student is within campus geofence (Haversine) |
| 2 | `POST` | `/gps-check` | Yes | Any | Frontend-compat alias for GPS verification |
| 3 | `POST` | `/verify-liveness` | Yes | Any | **Step 2a:** EAR-based blink detection (eyes must be closed, EAR < 0.22) |
| 4 | `POST` | `/liveness-check` | Yes | Any | Frontend-compat multipart alias for liveness |
| 5 | `GET` | `/voice-challenge` | Yes | Any | **Step 2b:** Get random challenge word for voice fallback |
| 6 | `POST` | `/verify-voice` | Yes | Any | **Step 2b:** Verify spoken challenge word via speech recognition |
| 7 | `POST` | `/verify-face` | Yes | Any | **Step 3:** Match face against ChromaDB embeddings, mark attendance |
| 8 | `POST` | `/face-verify` | Yes | Any | Frontend-compat multipart alias for face verification |
| 9 | `GET` | `/geofence` | Yes | Admin | Get current geofence config (Lat, Lng, Radius) |
| 10 | `PUT` | `/geofence` | Yes | Admin | Update geofence config (stored in Redis) |
| 11 | `DELETE` | `/geofence` | Yes | Admin | Reset geofence config to defaults |

### Enrollment & Marking
| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 12 | `POST` | `/enroll-face/{student_id}` | Yes | Admin/Faculty | Enroll a student's face (4 augmented variations per photo) |
| 13 | `POST` | `/enroll` | Yes | Any | Frontend-compat multipart enrollment (self or by admin) |
| 14 | `POST` | `/enroll-face-multi/{student_id}` | Yes | Admin/Faculty | Multi-photo enrollment (4+ recommended, each → 4 variations) |
| 15 | `POST` | `/mark` | Yes | Admin/Faculty | Manual/Bulk attendance marking (token-based) |

### Stats & Records
| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 16 | `GET` | `/stats/me` | Yes | Any | Get own attendance percentage and counts |
| 17 | `GET` | `/me` | Yes | Any | Get own attendance history list |
| 18 | `GET` | `/history/me` | Yes | Any | Frontend-compat own history list |
| 19 | `GET` | `/section/{section_id}` | Yes | Admin/Faculty | List attendance for a section (optional date filter) |
| 20 | `GET` | `/records` | Yes | Admin/Faculty | Frontend-compat section records with summary stats |
| 21 | `GET` | `/history` | Yes | Admin/Faculty | Frontend-compat global/section history list |
| 22 | `GET` | `/stats` | Yes | Admin/Faculty | Frontend-compat section summary stats |
| 23 | `PUT` | `/{attendance_id}` | Yes | Admin/Faculty | Manually override attendance status |
| 24 | `GET` | `/health` | No | — | Health check |

## Image Processing Utilities (`image_utils.py`)

| Function | Description |
|----------|-------------|
| `enhance_image` | CLAHE contrast enhancement for poor lighting |
| `generate_variations` | 4 augmented variants: CLAHE, webcam-sim, darker, brighter |
| `detect_eyes_state` | EAR-based blink detection (threshold: EAR < 0.22) |
| `verify_voice_challenge` | Transcribe audio via Google Speech Recognition |
| `get_face_encodings_enhanced` | Extract 128-D face encodings with CLAHE pre-processing |

**Graceful degradation:** All ML dependencies (`cv2`, `face_recognition`, `scipy`, `SpeechRecognition`) are optional with safe fallbacks.

## GPS Utilities (`gps_utils.py`)

| Function | Description |
|----------|-------------|
| `haversine_distance` | Great-circle distance between two GPS points (meters) |
| `is_on_campus` | Check if coordinates are within campus geofence radius |

## Kafka Producers

| Topic | Event | Payload |
|-------|-------|---------|
| `attendance_marked` | `ATTENDANCE_MARKED` | `{student_id, section_id, status, event}` |

## Docker Configuration

| Property | Value |
|----------|-------|
| Base Image | `python:3.11-slim` |
| System Packages | `gcc`, `libpq-dev`, `cmake`, `libgl1-mesa-glx`, `libglib2.0-0` |
| Exposed Port | `8000` |
| Healthcheck | `GET /health` (15s interval, 5s timeout, 3 retries, 30s start) |
| Entrypoint | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

## Dependencies (requirements.txt)

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
chromadb
numpy
redis
kafka-python
Pillow
```

> **Note:** `face_recognition`, `opencv-python`, `scipy`, and `SpeechRecognition` are used via try/except imports with graceful fallbacks — not listed in requirements.txt as they are optional heavy dependencies.
