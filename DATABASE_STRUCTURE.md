# Project Nexus Database Structure Reference (Complete)

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


This document provides a static reference for the database schemas used in Project Nexus. It covers PostgreSQL (Relational) and MongoDB (Document-based) structures.

## 1. PostgreSQL (Relational Data)
**Container:** `project_nexus-asad_node-postgres-1`  
**Database:** `nexus_db`  
**Total Tables:** 51

### 🔐 Module 1: Authentication & Security (5 Tables)
*   **auth_users**: Central identity table. (UUID PK, Email, PassHash, Names, Status).
*   **auth_roles**: System roles (Student, Faculty, Admin, HOD, Librarian, Alumni).
*   **auth_user_roles**: Many-to-many mapping of users to roles.
*   **auth_permissions**: Granular permissions (resource, action) per role.
*   **auth_api_keys**: API keys for external service integrations.

### 🎓 Module 2: Student Information System (SIS) (10 Tables)
*   **sis_departments**: University departments (CS, IT, etc.).
*   **sis_programs**: Degree programs (BSIT, BSCS).
*   **sis_students**: Detailed student profiles (RollNo, CNIC, RiskStatus).
*   **sis_faculty**: Detailed faculty profiles (EmployeeCode, Designation, Research).
*   **sis_faculty_availability**: Faculty availability slots for scheduling.
*   **sis_department_heads**: Tracking HOD assignments.
*   **sis_semesters**: Academic calendar periods.
*   **sis_enrollments**: Student registration in sections with final grades.
*   **sis_transcripts**: Academic performance history (SGPA/CGPA).
*   **sis_classrooms**: Physical room inventory for the scheduler.

### 📚 Module 3: Learning Management System (LMS) (10 Tables)
*   **lms_courses**: Master course catalog with credit hours.
*   **lms_sections**: Specific class instances per semester.
*   **lms_assignments**: Assignment tasks for students.
*   **lms_submissions**: Student assignment file references and marks.
*   **lms_quizzes**: Quiz metadata and time windows.
*   **lms_questions**: Question bank for quizzes.
*   **lms_answers**: Student quiz responses and scores.
*   **lms_attendance**: GPS and biometric verified logs.
*   **lms_course_materials**: Shared files/links for course sections.
*   **lms_timetable_slots**: Weekly schedule entries for sections.

### 💰 Module 4: Financial & Billing (6 Tables)
*   **fin_fee_heads**: Fee categories (Tuition, Library, Lab).
*   **fin_fee_structure**: Mapping fees to departments, programs, and semesters.
*   **fin_invoices**: Semester-level student billing.
*   **fin_invoice_items**: Line items within an invoice.
*   **fin_transactions**: Payment records (GatewayRef, Amount, Method).
*   **fin_fines**: Overdue payment and library penalties.

### 📖 Module 5: Library & Operations (7 Tables)
*   **lib_books**: Book catalog with availability tracking.
*   **lib_issues**: Borrowing transactions.
*   **lib_reservations**: Book hold requests for students.
*   **lib_librarian_profiles**: Detailed staff profiles for the library.
*   **ops_leaves**: Staff leave requests and approval workflows.
*   **ops_leave_documents**: Supporting attachments for leave requests.
*   **ops_grievances**: Student/staff complaint tickets.

### 🤝 Module 6: Alumni & Support (13 Tables)
*   **alumni_registry**: Profile database for graduated students.
*   **alumni_jobs**: Employment opportunities posted by alumni.
*   **alumni_events**: Networking and social events.
*   **alumni_event_registrations**: RSVP tracking for events.
*   **alumni_mentorship**: Mentorship specializations and availability.
*   **alumni_success_stories**: Featured profiles and articles.
*   **support_tickets**: Technical and general help desk tickets.
*   **support_ticket_messages**: Chat thread for support tickets.
*   **ops_grievance_comments**: Threaded discussion on grievance tickets.
*   **notifications**: General system alerts for users.
*   **hr_notifications**: Specialized HR/Leave notifications.
*   **sched_constraints**: Hard blocks for faculty or room scheduling.
*   **sched_timetable_sets**: Generated timetable versions.

---

## 2. MongoDB (Document & Event Data)
**Container:** `project_nexus-asad_node-mongodb-1`

| Database | Collections | Purpose |
|---|---|---|
| **nexus_chat** | `chat_sessions`, `chat_messages`, `ai_chat_sessions`, `ai_chat_messages` | Peer-to-peer and AI assistant chat history. |
| **nexus_ops** | `notifications`, `system_logs`, `media_assets`, `content_announcements`, `audit_trails` | Operational logs, announcements, and asset metadata. |
| **nexus_analytics**| `analytics_events` | Raw event stream for risk prediction and dashboarding. |
| **nexus_lms** | `feedback_surveys` | Course evaluations and feedback surveys. |
| **nexus_notify** | `notifications`, `content_announcements` | General system notifications. |

---

## 3. Vector & Cache (ChromaDB & Redis)
*   **ChromaDB**: Stores face embeddings and document vectors for RAG.
    *   Collections: `vectors_face_biometrics`, `vectors_faq_knowledge`, `vectors_university_policies`.
*   **Redis**: Real-time state management.
    *   Keys: `attendance:geofence` (Overrides), active user sessions, and JWT blacklists.
