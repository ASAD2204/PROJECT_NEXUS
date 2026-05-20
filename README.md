<div align="center">

# 🎓 Project Nexus
### The Unified Intelligent Polyglot Campus Platform

**Final Year Design Project (FYDP) — BS Information Technology**  
**Project ID:** `FYDP-BSIT-2504`

> **Status: 100% COMPLETED** — All microservices compiled, integrated, and fully verified for showcase.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](backend/services)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=white)](frontend)
[![AI](https://img.shields.io/badge/AI-Gemini%20RAG-orange?style=for-the-badge&logo=google-gemini&logoColor=white)](backend/services/ai-service)
[![Biometrics](https://img.shields.io/badge/Biometrics-Facial%20Recognition-blue?style=for-the-badge&logo=opencv&logoColor=white)](backend/services/attendance-service)
[![Docker](https://img.shields.io/badge/Infra-Docker%20Swarm-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)
[![Kafka](https://img.shields.io/badge/Event--Driven-Apache%20Kafka-black?style=for-the-badge&logo=apachekafka&logoColor=white)](backend/services/library-service)

</div>

---

## 📚 Table of Contents
1.  [🌟 Executive Summary](#-executive-summary)
2.  [🏗️ The Polyglot Architecture & Event-Driven Backbone](#%EF%B8%8F-the-polyglot-architecture--event-driven-backbone)
3.  [📦 Decoupled Microservices Matrix](#-decoupled-microservices-matrix)
4.  [✨ Core Advanced Features & Technical Deep-Dive](#-core-advanced-features--technical-deep-dive)
5.  [💻 Laptop Showcase Readiness Checklist](#-laptop-showcase-readiness-checklist)
6.  [🎯 Demonstration & Verification Path (Step-by-Step)](#-demonstration--verification-path-step-by-step)
7.  [🚀 Quick Start & Deployment Guide](#-quick-start--deployment-guide)
8.  [👥 Development Team & Institutional Context](#-development-team--institutional-context)

---

## 🌟 Executive Summary

**Project Nexus** is an enterprise-grade university ecosystem designed to dismantle the traditional "Data Silo" problem in higher education. Conventional institutions separate student records (SIS), learning management (LMS), HR workflows, and financial systems into isolated databases. **Nexus unifies these 14 distinct microservice domains into a single, high-performance, real-time platform.**

By combining **Computer Vision Face Biometrics**, **Generative AI (CAG + RAG)**, **Machine Learning**, and **Event-Driven Decoupling via Apache Kafka**, Nexus transforms the university platform from a passive record-keeper into an active, intelligent partner in student success and institutional growth.

---

## 🏗️ The Polyglot Architecture & Event-Driven Backbone

Nexus is engineered on a resilient, high-throughput microservices architecture. It leverages an **Nginx API Gateway** to route traffic, handle SSL termination, and enforce rate-limiting. Transactions (such as grade submissions and library returns) publish asynchronous events to **Apache Kafka**, decoupling core processes to guarantee that individual service outages do not halt critical university operations.

```mermaid
graph TD
    subgraph Client Application Layer
        React[React 19 SPA + Material UI 7]
    end

    subgraph API Gateway & Security Layer
        NGINX[Nginx Gateway / SSL / Rate Limiting]
    end

    subgraph Core Transactional Cluster
        Auth[Auth & RBAC Service]
        SIS[Student Information Service]
        LMS[Learning Management Service]
        Fin[Finance & Billing Service]
    end

    subgraph Intelligence & Automation Cluster
        AI[AI CAG + RAG Assistant]
        Attendance[Biometric CV Service]
        Analytics[ML Risk Predictor]
    end

    React <--> NGINX
    NGINX <--> Core Transactional Cluster
    NGINX <--> Intelligence & Automation Cluster

    LMS -- Grade Submitted Event --> Kafka{Apache Kafka Event Bus}
    Library[Library Service] -- Fine Generated Event --> Kafka
    Kafka --> SIS
    Kafka --> Fin
    Kafka --> Analytics
    Kafka --> Notify[Notification Service]
    
    style Kafka fill:#000,stroke:#fff,stroke-width:2px,color:#fff
    style NGINX fill:#009639,stroke:#fff,stroke-width:1px,color:#fff
    style React fill:#20232a,stroke:#61dafb,stroke-width:1px,color:#61dafb
```

---

## 📦 Decoupled Microservices Matrix

The platform comprises **14 independent microservices**, each featuring dedicated datastores and communication protocols:

| Service | Responsibility | Database | Communications | Dev Port |
|:---|:---|:---|:---|:---|
| **Auth** | Unified Identity, Security & Permission Mapping (RBAC) | PostgreSQL | REST API | `8001` |
| **SIS** | Departmental Hierarchy, Permanent Transcripts & Leaderboards | PostgreSQL + Redis | REST + Kafka Consumer | `8002` |
| **LMS** | Unified Classroom, Quizzes, Course Materials & Timetables | PostgreSQL | REST + Kafka Producer | `8003` |
| **Finance** | Automated Invoicing, Payments, Scholarships & Stripe Integration | PostgreSQL | REST + Kafka Consumer | `8004` |
| **Attendance** | Three-step Smart Check-In (GPS Radius + Face Biometrics) | ChromaDB + Redis | REST API | `8005` |
| **AI Assistant** | Degree-aware CAG + RAG Chatbot (Groq & Gemini Rotation) | ChromaDB + Redis | REST API | `8006` |
| **Chat** | Real-Time Peer-to-Peer & Group Messaging with WebSockets | MongoDB + Redis | REST + WebSockets | `8007` |
| **Analytics** | Scikit-learn Student Performance Risk Prediction | MongoDB | REST + Kafka Consumer | `8008` |
| **Operations** | Smart Grievance Auto-routing (NLP) & Announcements | MongoDB | REST API | `8009` |
| **HR** | Staff Management & Automated Casual/Sick Leave Workflows | PostgreSQL | REST API | `8010` |
| **Library** | Book Catalog, Overdue Circulation & Condition Fines | PostgreSQL | REST + Kafka Producer | `8011` |
| **Scheduler** | Hard Constraint-based Automated Timetabling | PostgreSQL | REST API | `8012` |
| **Notification** | Real-time WebSocket Push & Notifications | MongoDB + Redis | REST + WebSockets | `8013` |
| **AI Support** | Technical Helpdesk & System Documentation RAG | ChromaDB | REST API | `8014` |

---

## ✨ Core Advanced Features & Technical Deep-Dive

### 🧠 1. Real-Time CAG + RAG AI Assistant
* **Personalized Greeting Interception (Step 0)**: Detects conversational greetings (e.g., *"hey"*, *"hello"*) and intercepts the LLM pipeline. It queries the `auth_users` DB to greet the user by name and loads a role-specific specialist persona (*Strategic Success Partner* for Students, *Instructional Chief-of-Staff* for Teachers) without invoking expensive LLM tokens.
* **Live DB Grounding & Intent-Routing**: Intelligently parses user intents. If a student asks about their GPA, grades, or unpaid invoices, the semantic cache (CAG) is bypassed to query PostgreSQL in real-time, completely preventing hallucinated numbers.
* **LLM Key Rotation & Fallback**: Rotates api keys for Groq (`llama-3.1-8b-instant`) and Gemini (`gemini-2.0-flash`), falling back gracefully to local `all-MiniLM-L6-v2` embeddings in case of external API rate limits.

### 📸 2. Smart Biometric Attendance & Geofencing
* **Browser-Native Webcam Capture**: A custom-designed React interface capturing real-time biometrics.
* **Three-Factor Verification**: 
  1. **GPS Radius Validation**: Cross-checks user coordinates with a Redis-backed geofencing configuration (must be within a 50m radius of the classroom).
  2. **Blink Liveness Proof**: Monitors eye coordinates using OpenCV facial landmarks to analyze eye closing-to-opening transitions (EAR threshold = 0.2) to prevent print-out photo spoofing.
  3. **128-D Face Verification**: Matches facial embeddings against biometric profiles stored inside a ChromaDB vector store.

### 💼 3. Leave Application & Quota Management Hub
* **Dynamic Role Aesthetics**: The interface automatically transitions CSS styles, colors, and HSL gradients to match the user's role (Student `Teal`, Faculty `Purple`, HOD/Admin `Deep Blue`).
* **Active Leave Trackers**: Displays real-time Casual and Sick Leave balances (used vs remaining) pulled directly from PostgreSQL.
* **Asynchronous Attachment Streams**: Integrated with the gateway file upload API, streaming supporting documents (PDFs, images up to 10MB) asynchronously with interactive progress bars.

### 📚 4. Decoupled Overdue Fines & Condition-Based Returns
* **Status Normalization**: Automatically evaluates loan dates on both backend and frontend to map overdue books with a red **Overdue (X days)** chip, making them returnable directly from the Librarian Dashboard autocomplete.
* **Condition Penalties**: Allows returns under *"Good"*, *"Worn"* (PKR 100 fine), *"Damaged"* (PKR 500 fine), or *"Lost"* (PKR 1000 fine) conditions. Marking a book as Lost automatically decrements copy count in the catalog.
* **Kafka Event Ledger Sync**: Completely decoupled from the Finance DB; library returns publish a `fine_generated` event, which the Finance service consumes to cleanly apply the fine to the student's ledger.

### 🏛️ 5. High-Fidelity Transcript (DMC) PDF Generation
* **Academic Formatting**: Renders centered headings (*"DEPARTMENT OF EXAMINATIONS"*, *"DETAIL MARKS CERTIFICATE"*), university logo, and a side-by-side Ordinal Semester layout matching PUGC examination standards.
* **Auto-Grade Calculation**: Dynamically computes Obtained Marks (Midterm + Final + Sessional), quality points, Letter Grades, SGPAs, and cumulative CGPAs on a verified 4.0 scale.
* **Tuition Clearance Lockout**: Automatically queries all `fin_invoices` for the active semesters. If a single invoice is unpaid, the transcript download is blocked with a `403 Forbidden` response.

---

## 💻 Laptop Showcase Readiness Checklist

Before presenting the project from your laptop, verify this checklist to ensure absolute operational stability:

- [ ] **Docker Allocations**: Allocate at least **16GB RAM** and **6 CPUs** in Docker Desktop. Running all 27 microservices and data containers simultaneously requires sufficient resource headroom.
- [ ] **Environment Protection**: Ensure your local `.env` and `frontend/.env` files are kept locally. They are securely git-ignored under `.gitignore` and **will not** be deleted or committed.
- [ ] **Redis Lock Reset**: Lockout counters are fully cleared. If login fails repeatedly during testing, run `docker exec -it <redis-container> redis-cli FLUSHALL` to reset all attempt limits.
- [ ] **Port Conflicts**: Ensure ports `3001` (React), `3000` (Grafana), `5432` (Postgres), `6379` (Redis), and `9092` (Kafka) are free before launching.

---

## 🎯 Demonstration & Verification Path (Step-by-Step)

To showcase the platform's features without manual data entry, use the pre-seeded senior student profiles.

> [!IMPORTANT]
> **Showcase Credentials**: Both seeded demo student profiles use **`Student@12345`** (capital 'S', '@' sign, '12345'), **NOT** `password123`.

### 1. The Seeded Profiles
* **Zainab Fatima (5th Semester — `student5@nexus.edu` / `Student@12345`)**
  * *Academic State*: 4 completed semesters, 4 active registered courses, 100% paid invoices (DMC download unlocked), and a cumulative CGPA of **3.33**.
* **Bilal Siddiqui (8th Semester — `student8@nexus.edu` / `Student@12345`)**
  * *Academic State*: 7 completed semesters, 4 active registered courses, 100% paid invoices (DMC download unlocked), and a cumulative CGPA of **3.29**.
* **Librarian Profile (`librarian@nexus.edu` / `Librarian@12345`)**
  * *Circulation State*: Full catalog control, book returns, and fine generation portal.
* **System Administrator (`admin@nexus.edu` / `Admin@12345`)**
  * *State*: Full access to reports, dynamic timetabling, leave approvals, and student academic risk analytics.

---

### 2. Guided Showcase Scenarios

#### Scenario A: Seeded Login & High-Fidelity Transcript Download
1. Open the portal at `http://localhost:3001` (or gateway `http://localhost:80`).
2. Log in as Bilal Siddiqui (`student8@nexus.edu` / `Student@12345`).
3. Click on the **Academics** menu, then select **Transcripts**.
4. Observe the side-by-side list of 7 completed semesters with exact course codes, grades, and a cumulative CGPA of **3.29**.
5. Click **Download PDF** to generate the authentic two-column Detail Marks Certificate (DMC) rendering.

#### Scenario B: The Live Grounded AI Chatbot
1. While logged in as Bilal, click the floating **AI Assistant** icon in the bottom-right corner.
2. Type: *"hey"*
   * *Expected Response*: Intercepts (Step 0) and responds: *"Hello Bilal Siddiqui! I am your Strategic Success Partner. How can I assist you today?"* (Visualizing zero-token personalized greetings).
3. Type: *"what is my GPA?"*
   * *Expected Response*: The AI recognizes database intent, queries PostgreSQL in real-time, and responds with Bilal's exact GPA: **3.29**.
4. Type: *"do I have any unpaid fines?"*
   * *Expected Response*: The AI queries the finance schema and states that his ledger is 100% clear.

#### Scenario C: Decoupled Library Fines (Kafka Event Bus Demonstration)
1. In a private browser window, log in as the Librarian (`librarian@nexus.edu` / `Librarian@12345`).
2. Go to **Book Returns** and choose an active borrow log for Zainab Fatima.
3. Select return condition as **Damaged** (fine: PKR 500) and click **Process Return**.
4. *Behind the scenes*: `library-service` publishes a `fine_generated` event to the Kafka broker.
5. In Zainab's tab (`student5@nexus.edu`), navigate to **Finance & Billing**.
6. Refresh the page to see the new invoice for PKR 500 dynamically added to her ledger via the Kafka event listener!
7. Try downloading Zainab's transcript — it will be **blocked** because her ledger now has an unpaid fine! (Tuition Clearance Lockout).

#### Scenario D: ML Academic Risk Prediction (Admin Portal)
1. Log in as the Administrator (`admin@nexus.edu` / `Admin@12345`).
2. Navigate to **User Management** -> **Academic Performance**.
3. View the **At-Risk Students Registry** table.
4. Watch how the scikit-learn analytics engine evaluates grades and automatically flags students below the performance threshold.

---

## 🚀 Quick Start & Deployment Guide

The entire monorepo is fully containerized and pre-configured for instant deployment:

```bash
# 1. Clone the repository (if not already done)
git clone https://github.com/ASAD2204/PROJECT_NEXUS.git
cd PROJECT_NEXUS

# 2. Start the entire microservices stack (27 Docker containers)
docker-compose up -d --build
```

### Access Endpoints
* **Web UI Portal**: `http://localhost:3001` (Direct) or `http://localhost:80` (API Gateway)
* **Prometheus**: `http://localhost:9090` (Metrics)
* **Grafana**: `http://localhost:3000` (Dashboards)

> [!CAUTION]
> **Environment Security**: Keep your local `.env` and `frontend/.env` files safe! They contain database configurations, API keys, and JWT secrets. They are ignored by git and **will not** be committed or uploaded.

---

## 👥 Development Team & Institutional Context

| Name | Roll Number | Role | GitHub |
|:---|:---|:---|:---|
| **Muhammad Asad** | BIT22031 | Project Lead & Backend Architect | [@ASAD2204](https://github.com/ASAD2204) |
| **Muhammad Saad** | BIT22034 | Frontend Lead & AI Engineer | [@saadi-js](https://github.com/saadi-js) |
| **Muhammad Hanzla** | BIT22002 | QA Lead & UI/UX Specialist | [@Hanzla56-H](https://github.com/Hanzla56-H) |

* **Supervisor**: Dr. Ghulam Mustafa  
* **Institution**: Department of Information Technology, University of the Punjab, Gujranwala Campus

---

<div align="center">

**© 2025-2026 Department of Information Technology, University of the Punjab, Gujranwala Campus**  
*Built with ❤️ for a Smarter, Connected Digital Campus.*

</div>
