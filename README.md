> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.

<div align="center">

# Project Nexus
### Unified Intelligent Campus Platform

Final Year Design Project (FYDP) for BS Information Technology  
Project ID: FYDP-BSIT-2504

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)](frontend/README.md)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20Microservices-009688?style=for-the-badge&logo=fastapi&logoColor=white)](backend/services)
[![Database](https://img.shields.io/badge/Data-PostgreSQL%20%2B%20MongoDB-336791?style=for-the-badge&logo=postgresql&logoColor=white)](infrastructure/postgres/init.sql)
[![Messaging](https://img.shields.io/badge/Messaging-Apache%20Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)](infrastructure/kafka/README.md)
[![Infra](https://img.shields.io/badge/Infra-Docker%20%2B%20Observability-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)
[![License](https://img.shields.io/badge/License-Proprietary-important?style=for-the-badge)](LICENSE)

</div>

---

## Table of Contents

- [Project Nexus](#project-nexus)
    - [Unified Intelligent Campus Platform](#unified-intelligent-campus-platform)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [What Makes It Special](#what-makes-it-special)
  - [Architecture](#architecture)
    - [High-Level Design](#high-level-design)
    - [Principles](#principles)
  - [Microservices](#microservices)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [1) Prerequisites](#1-prerequisites)
    - [2) Clone project](#2-clone-project)
    - [3) Configure environment](#3-configure-environment)
    - [4) Start full stack](#4-start-full-stack)
    - [5) Access endpoints](#5-access-endpoints)
    - [6) Frontend-only development](#6-frontend-only-development)
  - [Configuration and Environment](#configuration-and-environment)
  - [Operations and Observability](#operations-and-observability)
    - [Data Stores and Bootstrap Scripts](#data-stores-and-bootstrap-scripts)
    - [Event Streaming](#event-streaming)
    - [Monitoring](#monitoring)
    - [Backups](#backups)
  - [Documentation Map](#documentation-map)
    - [Frontend](#frontend)
    - [Service Docs](#service-docs)
    - [Project-Level](#project-level)
  - [Roadmap](#roadmap)
  - [Team](#team)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Overview

Project Nexus is a complete, AI-assisted university ecosystem built as a polyglot microservices platform. It combines academics, administration, finance, operations, attendance intelligence, and communication into one cohesive system.

The platform is designed around a practical campus objective:

- Remove disconnected systems and duplicate data entry
- Enable event-driven automation across departments
- Provide role-specific experiences for students, faculty, admin, alumni, HR, and library operations
- Deliver predictive and assistive intelligence through analytics and AI services

---

## What Makes It Special

- End-to-end campus operating system instead of isolated modules
- Event-driven backbone with Kafka for reliable async workflows
- Hybrid AI assistant pipeline with retrieval and semantic context
- Cross-domain analytics for intervention and planning
- Operationally ready stack with gateway, monitoring, and backups

---

## Architecture

### High-Level Design

- Frontend: React + Vite + Material UI
- API Access: Nginx API Gateway
- Backend: Domain-based FastAPI microservices
- Relational Data: PostgreSQL
- Document/Event Data: MongoDB
- Cache and Session Layer: Redis
- Vector Retrieval: ChromaDB
- Async Backbone: Apache Kafka
- Monitoring: Prometheus + Grafana + Blackbox Exporter
- Backup: Scheduled backup service for PostgreSQL and MongoDB

### Principles

- Service isolation by domain
- Event-first integration over tight service coupling
- Stateless API services with externalized state
- Role-based access control and JWT security
- Infrastructure-as-code via Docker orchestration

---

## Microservices

Project Nexus currently includes the following backend services:

| Service | Domain Responsibility | Docs |
|---|---|---|
| Auth Service | Identity, role mapping, authorization primitives | [backend/services/auth-service/README.md](backend/services/auth-service/README.md) |
| SIS Service | Departments, programs, semesters, enrollment intelligence | [backend/services/sis-service/README.md](backend/services/sis-service/README.md) |
| LMS Service | Courses, sections, assignments, quizzes, classroom workflows | [backend/services/lms-service/README.md](backend/services/lms-service/README.md) |
| Finance Service | Invoices, transactions, fee heads, fines | [backend/services/finance-service/README.md](backend/services/finance-service/README.md) |
| Attendance Service | GPS + liveness + biometric attendance flow | [backend/services/attendance-service/README.md](backend/services/attendance-service/README.md) |
| AI Service | Hybrid CAG/RAG assistant, retrieval pipeline, status and chat | [backend/services/ai-service/README.md](backend/services/ai-service/README.md) |
| Chat Service | User-to-user and session-based communication | [backend/services/chat-service/README.md](backend/services/chat-service/README.md) |
| Analytics Service | Dashboards, risk scoring, analytics event processing | [backend/services/analytics-service/README.md](backend/services/analytics-service/README.md) |
| HR Service | Leave workflows, notifications, employee controls | [backend/services/hr-service/README.md](backend/services/hr-service/README.md) |
| Library Service | Catalog, issue/return, reservations, fine linkage | [backend/services/library-service/README.md](backend/services/library-service/README.md) |
| Operations Service | Grievances, service workflows, ops records | [backend/services/operations-service/README.md](backend/services/operations-service/README.md) |
| Alumni Service | Alumni registry, events, jobs, mentorship, stories | [backend/services/alumni-service/README.md](backend/services/alumni-service/README.md) |
| Scheduler Service | Timetable constraints and generation workflows | [backend/services/scheduler-service](backend/services/scheduler-service) |

Gateway and shared layers:

- API Gateway: [backend/api-gateway](backend/api-gateway)
- Shared modules: [backend/shared](backend/shared)

---

## Project Structure

```text
Project_Nexus/
├── .github/                       # CI/CD workflows
├── backend/
│   ├── api-gateway/
│   ├── services/
│   │   ├── ai-service/
│   │   ├── alumni-service/
│   │   ├── analytics-service/
│   │   ├── attendance-service/
│   │   ├── auth-service/
│   │   ├── chat-service/
│   │   ├── finance-service/
│   │   ├── hr-service/
│   │   ├── library-service/
│   │   ├── lms-service/
│   │   ├── operations-service/
│   │   ├── scheduler-service/
│   │   └── sis-service/
│   └── shared/
├── frontend/
├── infrastructure/
├── frontend/
├── .env.example
│   ├── backup/
├── Instructions.md
└── README.md
```

---

## Getting Started

### 1) Prerequisites

- Docker Desktop
- Git
- Optional for frontend-only development: Node.js 18+

### 2) Clone project

```bash
git clone https://github.com/ASAD2204/PROJECT_NEXUS.git
cd PROJECT_NEXUS
```

### 3) Configure environment

```bash
cp .env.example .env
```

If your local setup does not include a root .env.example, provide required environment variables through your shell, Compose overrides, or deployment platform.

### 4) Start full stack

Option A: Docker Compose

```bash
docker compose up -d --build
```

Option B: Docker Swarm

```bash
docker swarm init
docker stack deploy -c docker-compose.yml nexus
```

### 5) Access endpoints

- API Gateway: http://localhost/
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Redis: localhost:6379
- Kafka: localhost:9092

### 6) Frontend-only development

```bash
cd frontend
npm install
npm run dev
```

---

## Configuration and Environment

Main environment values used across services:

- JWT secret and token settings
- PostgreSQL connection string
- MongoDB connection string
- Redis URL
- Kafka broker URL
- ChromaDB host and port
- Grafana admin credentials

Production recommendations:

- Use strong secret values and rotate regularly
- Restrict public ports where possible
- Use managed volumes and secure backups
- Replace permissive CORS settings with allowlists

---

## Operations and Observability

### Data Stores and Bootstrap Scripts

- PostgreSQL schema bootstrap: [infrastructure/postgres/init.sql](infrastructure/postgres/init.sql)
- Mongo collections and indexes: [infrastructure/mongo/init-mongo.js](infrastructure/mongo/init-mongo.js)

### Event Streaming

- Kafka guide and topic references: [infrastructure/kafka/README.md](infrastructure/kafka/README.md)

### Monitoring

- Prometheus config: [infrastructure/monitoring/prometheus.yml](infrastructure/monitoring/prometheus.yml)
- Blackbox probes: [infrastructure/monitoring/blackbox.yml](infrastructure/monitoring/blackbox.yml)
- Grafana provisioning: [infrastructure/monitoring/grafana](infrastructure/monitoring/grafana)

### Backups

- Backup container and scripts: [infrastructure/backup](infrastructure/backup)

---

## Documentation Map

### Frontend

- Main frontend guide: [frontend/README.md](frontend/README.md)
- Frontend deployment notes: [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)
- Frontend Docker guide: [frontend/docker/README.md](frontend/docker/README.md)

### Service Docs

- [backend/services/auth-service/README.md](backend/services/auth-service/README.md)
- [backend/services/sis-service/README.md](backend/services/sis-service/README.md)
- [backend/services/lms-service/README.md](backend/services/lms-service/README.md)
- [backend/services/finance-service/README.md](backend/services/finance-service/README.md)
- [backend/services/attendance-service/README.md](backend/services/attendance-service/README.md)
- [backend/services/ai-service/README.md](backend/services/ai-service/README.md)
- [backend/services/chat-service/README.md](backend/services/chat-service/README.md)
- [backend/services/analytics-service/README.md](backend/services/analytics-service/README.md)
- [backend/services/hr-service/README.md](backend/services/hr-service/README.md)
- [backend/services/library-service/README.md](backend/services/library-service/README.md)
- [backend/services/operations-service/README.md](backend/services/operations-service/README.md)
- [backend/services/alumni-service/README.md](backend/services/alumni-service/README.md)

### Project-Level

- Architecture and build notes: [Instructions.md](Instructions.md)
- Deployment playbook: [deployment/README.md](deployment/README.md)
- Runtime stack: [docker-compose.yml](docker-compose.yml)
- Frontend to backend API mapping: [API_CONNECTIVITY_README.md](API_CONNECTIVITY_README.md)

---

## Roadmap

- Harden production security defaults and environment profiles
- Complete integration and contract tests across all API domains
- Expand analytics and alerting dashboards for operational SLOs
- Add migration tooling for zero-downtime schema updates
- Publish release notes and versioned deployment bundles

---

## Team

| Name | Roll Number | GitHub |
|---|---|---|
| Muhammad Asad | BIT22031 | [@ASAD2204](https://github.com/ASAD2204) |
| Muhammad Saad | BIT22034 | [@saadi-js](https://github.com/saadi-js) |
| Muhammad Hanzla | BIT22002 | [@Hanzla56-H](https://github.com/Hanzla56-H) |

Supervisor: Dr. Ghulam Mustafa  
Coordinator: Mr. Muhammad Younas  
Department of Information Technology, University of the Punjab, Gujranwala Campus

---

## License

This repository is proprietary academic work.

- Full license text: [LICENSE](LICENSE)
- Frontend license notice: [frontend/LICENSE](frontend/LICENSE)

Key points:

- Not open source
- No unauthorized redistribution or commercial use
- Academic and evaluation usage only unless explicitly permitted in writing

---

## Acknowledgments

Thanks to faculty advisors, supervisors, and reviewers who supported the project architecture, validation, and iterative quality improvements.

---

<div align="center">

Built for an integrated, intelligent, and operationally resilient digital campus.

</div>
This project is developed as an FYDP deliverable for academic and evaluation use under institutional ownership and policy. Refer to departmental guidance for distribution and reuse permissions.

---

<div align="center">

Built for an integrated, intelligent, and operationally resilient digital campus.

</div>
