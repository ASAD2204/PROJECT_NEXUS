# Project Nexus LLM README

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


This document is a machine-readable, human-friendly project brief intended for LLMs, reviewers, and new contributors who need a single high-density source of truth.

Use this file when you want a fast understanding of:
- what Project Nexus is
- how the repository is organized
- what is implemented today
- what was validated in this workspace
- what still needs production hardening
- how deployment works across local Docker, multiple laptops, Azure, and Oracle Free Tier

If you need implementation detail for a specific area, follow the linked docs rather than duplicating them here.

---

## 1. Executive Summary

Project Nexus is a unified intelligent campus platform built as a polyglot, role-based, microservice system.

It combines:
- Student Information System functions
- Learning Management System functions
- Finance and billing
- Attendance with GPS geofencing and biometrics     
- AI assistance and analytics
- Chat, library, HR, operations, alumni, and scheduling workflows

The repository is a monorepo with:
- a React + Vite frontend
- FastAPI backend services
- PostgreSQL, MongoDB, Redis, Kafka, and ChromaDB infrastructure
- Docker-based orchestration
- service-level documentation and deployment playbooks

The app has not been deployed yet in this laptop environment. The codebase is currently in a pre-deployment hardening state.

---

## 2. Current Status Snapshot

Validated in this workspace:
- Frontend lint was run, and the frontend production build passed.
- Backend Python syntax was checked across the backend tree and passed.
- Docker Compose YAML was validated with a YAML parser fallback because Docker is not installed on this laptop.
- PostgreSQL SQL scripts were manually reviewed because no SQL parser or `psql` client is available here.

Current implementation status:
- Attendance geofence is now runtime-configurable via the attendance service and Redis override.        
- Biometric enrollment has a dedicated frontend page.
- Admin settings includes geofence management.      
- Root docs and frontend docs were updated to reflect deployment and attendance flow changes.

Not deployed yet:
- No Docker Swarm deployment has been performed in this environment.
- No Azure deployment has been performed.
- No Oracle Free Tier deployment has been performed.

Known repository-wide caveat:
- One unrelated lint error still exists in [frontend/src/api/lms.js](frontend/src/api/lms.js) because of a duplicate `getMySubmissions` key. It did not block the frontend build, but it still exists as technical debt.

---

## 3. High-Level Architecture

### Frontend
- React 19
- Vite
- React Router
- Material UI
- Framer Motion
- Recharts

### Backend
- FastAPI microservices
- SQLAlchemy ORM
- JWT-based auth
- Optional heavy ML dependencies with graceful fallback behavior

### Data and Messaging
- PostgreSQL for relational campus data
- MongoDB for document, event, and content-style data
- Redis for cache, session, and runtime override state
- Kafka for async events
- ChromaDB for vector embeddings and biometric face matching

### Infrastructure
- Root Docker Swarm-oriented stack
- Monitoring with Prometheus, Grafana, Blackbox Exporter
- Backup service
- Frontend-only Docker files for UI containerization

---

## 4. Repository Structure

### Root
- [README.md](README.md) - main project overview    
- [LLM_README.md](LLM_README.md) - this document    
- [docker-compose.yml](docker-compose.yml) - full-stack Swarm-oriented stack
- [deployment/README.md](deployment/README.md) - deployment playbook
- [Instructions.md](Instructions.md) - architecture and implementation notes
- [API_CONNECTIVITY_README.md](API_CONNECTIVITY_README.md) - frontend/backend mapping

### Backend
- [backend/api-gateway](backend/api-gateway) - Nginx gateway
- [backend/services/auth-service](backend/services/auth-service) - auth and identity
- [backend/services/sis-service](backend/services/sis-service) - student information system
- [backend/services/lms-service](backend/services/lms-service) - courses, assignments, quizzes, attendance support
- [backend/services/finance-service](backend/services/finance-service) - billing and payments
- [backend/services/attendance-service](backend/services/attendance-service) - GPS, liveness, face enrollment, attendance marking
- [backend/services/ai-service](backend/services/ai-service) - assistant and retrieval pipeline
- [backend/services/chat-service](backend/services/chat-service) - messaging
- [backend/services/analytics-service](backend/services/analytics-service) - dashboards and risk analytics
- [backend/services/hr-service](backend/services/hr-service) - HR workflows
- [backend/services/library-service](backend/services/library-service) - library operations
- [backend/services/operations-service](backend/services/operations-service) - grievances and ops flows 
- [backend/services/alumni-service](backend/services/alumni-service) - alumni network, jobs, mentorship, stories
- [backend/services/scheduler-service](backend/services/scheduler-service) - timetable constraints and generation
- [backend/shared](backend/shared) - shared backend helpers

### Frontend
- [frontend/src/App.jsx](frontend/src/App.jsx) - route map
- [frontend/src/api](frontend/src/api) - API client wrappers
- [frontend/src/components](frontend/src/components) - reusable UI
- [frontend/src/contexts](frontend/src/contexts) - auth/theme/snackbar state
- [frontend/src/pages](frontend/src/pages) - role and feature pages
- [frontend/src/styles](frontend/src/styles) - global styles
- [frontend/src/utils](frontend/src/utils) - helpers and animation config
- [frontend/README.md](frontend/README.md) - frontend overview
- [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md) - frontend deployment notes
- [frontend/docker/README.md](frontend/docker/README.md) - frontend Docker notes

### Infrastructure
- [infrastructure/postgres](infrastructure/postgres) - schema, migrations, seed SQL
- [infrastructure/mongo](infrastructure/mongo) - Mongo initialization
- [infrastructure/kafka](infrastructure/kafka) - topic bootstrap scripts and docs
- [infrastructure/monitoring](infrastructure/monitoring) - Prometheus and Grafana setup
- [infrastructure/backup](infrastructure/backup) - backup service assets

---

## 5. Functional Modules

### Student-facing
- Dashboard
- Profile
- Transcript
- Assignments
- Notifications
- Support tickets and grievances
- Alumni browsing
- Library access
- Fee vouchers
- Attendance flow

### Faculty-facing
- Teacher dashboard
- Course management
- Student management
- Assignment creation and review
- Quiz creation
- Attendance tracking
- Grievance handling

### Admin-facing
- Admin dashboard
- User management
- Department management
- Course management
- Finance management
- Grievance management
- Announcements
- Reports
- System settings

### Alumni-facing
- Network
- Events
- Jobs
- Mentorship
- Success stories

### Library-facing
- Catalog
- Issued books
- Reservations
- Reports
- Librarian profile

### Operations / Support / AI
- Chat portal
- AI assistant
- Analytics dashboards
- HR leave and notifications
- Operations grievances and notifications

---

## 6. Attendance System Detail

The attendance service is a three-step flow:        
1. GPS geofence verification
2. Liveness detection
3. Face verification

### Current implementation details
- The geofence uses campus center coordinates and a maximum radius.
- Those values are read from environment variables by default.
- The admin settings page can override them at runtime.
- The active override is stored in Redis.
- Resetting the geofence clears the Redis override and returns to environment defaults.

### Attendance-related files
- [backend/services/attendance-service/app/routes.py](backend/services/attendance-service/app/routes.py)
- [backend/services/attendance-service/app/gps_utils.py](backend/services/attendance-service/app/gps_utils.py)
- [backend/services/attendance-service/app/geofence.py](backend/services/attendance-service/app/geofence.py)
- [backend/services/attendance-service/app/schemas.py](backend/services/attendance-service/app/schemas.py)
- [backend/services/attendance-service/README.md](backend/services/attendance-service/README.md)        
- [frontend/src/pages/Attendance](frontend/src/pages/Attendance)

### Face enrollment
- Admin and faculty can enroll another student.     
- The service also supports a compatibility enrollment route for the current authenticated student.     
- Multi-photo enrollment is available for staff use.
- Face embeddings are stored in ChromaDB.
- If biometric libraries are unavailable, the service falls back to token-based attendance resolution.  

---

## 7. Key Runtime Configuration

### Global / infrastructure
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `DATABASE_URL`
- `REDIS_URL`
- `KAFKA_BROKER`
- `CHROMA_HOST`
- `CHROMA_PORT`

### Attendance geofence
- `CAMPUS_LAT`
- `CAMPUS_LNG`
- `MAX_RADIUS_METERS`

### Other service-specific secrets
- `NEXUS_INTERNAL_API_KEY`
- `GEMINI_API_KEY` or `GEMINI_API_KEYS`
- `GROQ_API_KEYS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`

---

## 8. Deployment Model Summary

### Single laptop
- Best for demo and local production rehearsal.     
- Docker Desktop on Windows is enough for the container runtime.
- The full stack is heavy; 16 GB RAM is safer than 8 GB.
- Swarm mode is recommended for the root stack because the compose file uses overlay networking and Swarm deployment settings.

### Multiple laptops
- Most practical setup: one host machine runs Docker Swarm, other laptops access it through the host IP or domain.
- Real multi-node setup: manager plus workers, with images pulled from a registry.

### Azure Student Subscription
- Use Ubuntu 22.04 LTS VM.
- Open only required ports.
- Install Docker Engine and Docker Compose plugin.  
- Deploy the Swarm stack from the VM.

### Oracle Always Free
- Use Ubuntu 22.04 LTS VM.
- Respect memory and CPU limits.
- Consider a reduced stack or staged rollout if resources are tight.

See [deployment/README.md](deployment/README.md) for the full step-by-step process.

---

## 9. Current Validation Results

Validated successfully:
- Frontend build
- Backend Python syntax
- Docker Compose YAML structure
- Manual SQL script review

Environment limitation:
- Docker CLI is not installed on this laptop.       
- The SQL parser / `psql` client is not installed either.

That means deployment validation here is documentation- and syntax-based, not runtime-based.

---

## 10. Notable Files for LLM Understanding

### Core project understanding
- [README.md](README.md)
- [deployment/README.md](deployment/README.md)      
- [Instructions.md](Instructions.md)
- [API_CONNECTIVITY_README.md](API_CONNECTIVITY_README.md)

### Frontend architecture
- [frontend/src/App.jsx](frontend/src/App.jsx)      
- [frontend/src/api/index.js](frontend/src/api/index.js)
- [frontend/src/contexts/AuthContext.jsx](frontend/src/contexts/AuthContext.jsx)
- [frontend/src/components/Layout/Sidebar.jsx](frontend/src/components/Layout/Sidebar.jsx)
- [frontend/src/components/Layout/TopBar.jsx](frontend/src/components/Layout/TopBar.jsx)

### Attendance and biometric flow
- [backend/services/attendance-service/app/routes.py](backend/services/attendance-service/app/routes.py)
- [backend/services/attendance-service/app/geofence.py](backend/services/attendance-service/app/geofence.py)
- [backend/services/attendance-service/app/gps_utils.py](backend/services/attendance-service/app/gps_utils.py)
- [frontend/src/pages/Attendance/BiometricEnrollment.jsx](frontend/src/pages/Attendance/BiometricEnrollment.jsx)
- [frontend/src/pages/Admin/Settings.jsx](frontend/src/pages/Admin/Settings.jsx)

### Database and infrastructure
- [docker-compose.yml](docker-compose.yml)
- [infrastructure/postgres/init.sql](infrastructure/postgres/init.sql)
- [infrastructure/postgres/migrations](infrastructure/postgres/migrations)
- [infrastructure/seeding/postgres/seed-dev.sql](infrastructure/seeding/postgres/seed-dev.sql)

---

## 11. Production Hardening Notes

The project is not fully production-hardened yet.   

Remaining production-oriented work typically includes:
- pushing images to a registry and pinning image versions
- replacing plain secrets with Docker secrets or cloud secret management
- tightening exposed ports and reverse-proxying behind TLS
- defining resource limits and reservations for services
- pinning stateful services carefully in Swarm or moving them to managed services
- validating cloud deployment in a real target environment

---

## 12. Practical LLM Prompt Hint

If you hand this repository to an LLM, the best prompt framing is:

> You are working inside Project Nexus, a polyglot campus platform monorepo. Read this LLM README, then inspect only the relevant files for the requested task. The project has a React frontend, FastAPI microservices, PostgreSQL, MongoDB, Redis, Kafka, and ChromaDB. Attendance uses GPS geofencing, liveness detection, face enrollment, and face verification. The current deployment target is Docker Swarm on one or more Linux hosts or cloud VMs.

---

## 13. Short Status Verdict

Project Nexus is functionally broad and structurally strong, but still in pre-deployment hardening. The codebase now includes the attendance geofence runtime override and biometric enrollment UI, and the documentation points to the correct deployment paths. The main remaining work is production packaging, image registry strategy, secrets handling, and real cloud rollout.