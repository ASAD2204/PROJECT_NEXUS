# Scheduler Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> **Constraint-Based Timetable Generation microservice for Project Nexus**

## Overview

The Scheduler Service automates the generation of conflict-free academic timetables using Google's OR-Tools (`cp_model`). It ensures that faculty, rooms, and student batches (Program + Semester) do not have overlapping sessions.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **SQLAlchemy** | PostgreSQL ORM |
| **OR-Tools** | CP-SAT solver for constraint satisfaction |
| **Python 3.11** | Runtime |

## Core Logic: The Solver

The service uses a Constraint Programming (CP) approach:
1.  **Hard Constraints**:
    *   No faculty can be in two places at once.
    *   No room can hold two sections at once.
    *   No student batch (Program + Semester) can have two classes at once.
    *   Adherence to `sched_constraints` (e.g., "Room 101 closed for maintenance").
    *   Adherence to `sis_faculty_availability`.
2.  **Soft/Business Constraints**:
    *   Lunch breaks.
    *   Maximum classes per day per batch.

## API Endpoints

All endpoints are prefixed with `/api/v1/scheduler`.

### Constraints Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/constraints` | HOD/Admin | Create a manual block (Faculty/Room/Time) |
| `GET` | `/constraints` | HOD/Admin | List all manual blocks |
| `DELETE` | `/constraints/{id}` | HOD/Admin | Remove a manual block |

### Timetable Generation
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/generate` | HOD/Admin | Run the solver to generate a conflict-free timetable |
| `GET` | `/timetable-sets` | HOD/Admin | List generated timetable versions (Drafts/Published) |
| `GET` | `/timetable-sets/{id}` | HOD/Admin | Get detailed slots of a specific version |
| `POST` | `/timetable-sets/{id}/publish` | HOD/Admin | Commit draft slots to the live `lms_timetable_slots` |
| `DELETE` | `/timetable-sets/{id}` | HOD/Admin | Delete a version |
| `GET` | `/timetable-sets/{id}/export` | HOD/Admin | Export version as CSV |
| `GET` | `/health` | No | Health check |

## PostgreSQL Models

### `sched_constraints`
| Column | Type | Description |
|--------|------|-------------|
| `resource_type` | String | `faculty` or `room` |
| `resource_id` | String | ID of the faculty or room number |
| `day_of_week` | String | Monday, Tuesday, etc. |
| `start_time` | Time | Block start |
| `end_time` | Time | Block end |

### `sched_timetable_sets`
| Column | Type | Description |
|--------|------|-------------|
| `name` | String | Version name |
| `status` | String | `draft` or `published` |
| `slots_json` | Text | Serialized JSON array of generated slots |

## Solver Implementation Detail

The solver builds a boolean variable matrix `x[(section_id, slot_idx)]`.
*   It filters out `slot_idx` candidates that overlap with existing `lms_timetable_slots` (incremental scheduling) or `sched_constraints`.
*   It ensures `sum(x[section]) == 1` for all requested sections.
*   It adds `x_a + x_b <= 1` for any overlapping `slot_idx` pair if sections `a` and `b` share a resource (Teacher/Room/Batch).
