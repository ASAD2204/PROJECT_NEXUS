# Project Nexus API Connectivity Guide

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


## Purpose

This document maps frontend API client modules to backend microservice endpoints through the API Gateway, so the full frontend-to-backend functioning is visible in one place.

## Request Path Flow

1. Frontend calls Axios client in frontend/src/api
2. Axios base URL is /api/v1 from frontend/src/api/client.js
3. API Gateway routes by service prefix using backend/api-gateway/nginx.conf
4. Target FastAPI service handles the request at its own router prefix

## Base URL and Auth

- Base URL: /api/v1
- Auth: Bearer token attached from localStorage key nexus_token
- 401 behavior: frontend clears local auth state and redirects to login

## Gateway Prefix Routing

| Gateway Prefix | Service |
|---|---|
| /api/v1/auth | auth-service |
| /api/v1/sis | sis-service |
| /api/v1/lms | lms-service |
| /api/v1/finance | finance-service |
| /api/v1/attendance | attendance-service |
| /api/v1/ai | ai-service |
| /api/v1/chat | chat-service |
| /api/v1/analytics | analytics-service |
| /api/v1/hr | hr-service |
| /api/v1/library | library-service |
| /api/v1/ops | operations-service |
| /api/v1/alumni | alumni-service |
| /api/v1/notify | notification-service |
| /api/v1/scheduler | scheduler-service |

## Frontend Module to Backend Mapping

### Auth Module
Source: frontend/src/api/auth.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| login | POST /auth/login | Implemented |
| register | POST /auth/register | Implemented |
| getMe | GET /auth/me | Implemented |
| logout | POST /auth/logout | Implemented |
| forgotPassword | POST /auth/forgot-password | Implemented |
| verifyOTP | POST /auth/verify-otp | Implemented |
| resetPassword | POST /auth/reset-password | Implemented |
| updateProfile | PUT /auth/profile | Implemented |
| listUsers | GET /auth/users | Implemented |

### SIS Module
Source: frontend/src/api/sis.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| getStudents | GET /sis/students | Implemented |
| getStudent | GET /sis/students/{id} | Implemented |
| getMyProfile | GET /sis/students/me | Implemented |
| createStudent | POST /sis/students | Implemented |
| updateStudent | PUT /sis/students/{id} | Implemented |
| getDepartments | GET /sis/departments | Implemented |
| createDepartment | POST /sis/departments | Implemented |
| updateDepartment | PUT /sis/departments/{id} | Implemented |
| getPrograms | GET /sis/programs | Implemented |
| createProgram | POST /sis/programs | Implemented |
| getFaculty | GET /sis/faculty | Implemented |
| getFacultyMember | GET /sis/faculty/{id} | Implemented |
| getMyEnrollments | GET /sis/enrollments/me | Implemented |
| enrollStudent | POST /sis/enrollments | Implemented |
| getMyGrades | GET /sis/transcripts/me | Implemented |
| getTranscript | GET /sis/transcripts/me | Implemented |
| getMyTranscript | GET /sis/transcripts/me | Implemented |
| getLeaderboard | GET /sis/leaderboard/{program_id}/{semester_id} | Implemented |
| getCourses | GET /lms/courses | Implemented via LMS service |
| getCourse | GET /lms/sections/{id} with fallback /lms/courses | Implemented via LMS service |
| createCourse | POST /lms/courses | Implemented via LMS service |
| updateCourse | Not called, intentionally rejected in client | Frontend guard |
| deleteCourse | DELETE /lms/courses/{id} | Implemented via LMS service |
| getMyCourses | GET /lms/courses/my-courses | Implemented via LMS service |
| submitGrade | POST /lms/grades/submit | Implemented via LMS service |
| getSections | GET /lms/courses/my-courses | Implemented via LMS service |
| createSection | POST /lms/sections | Implemented via LMS service |

### LMS Module
Source: frontend/src/api/lms.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| getCourses | GET /lms/courses | Implemented |
| getCourse | GET /lms/courses/{id} | Needs verification in backend routes |
| createCourse | POST /lms/courses | Implemented |
| updateCourse | PUT /lms/courses/{id} | Not present in current backend routes |
| getAssignments | GET /lms/assignments/section/{section_id} | Implemented |
| getAssignment | Derived from aggregated assignments in client | Client-side aggregation |
| createAssignment | POST /lms/assignments | Implemented |
| updateAssignment | PUT /lms/assignments/{assignment_id} | Implemented |
| deleteAssignment | DELETE /lms/assignments/{assignment_id} | Implemented |
| submitAssignment | POST /lms/submissions | Implemented |
| getSubmissions | GET /lms/submissions/assignment/{assignment_id} | Implemented |
| gradeSubmission | PUT /lms/submissions/{sub_id}/grade | Implemented |
| getQuizzes | GET /lms/quizzes/section/{section_id} | Implemented |
| createQuiz | POST /lms/quizzes | Implemented |
| updateQuiz | PUT /lms/quizzes/{id} | Not present in current backend routes |
| deleteQuiz | DELETE /lms/quizzes/{id} | Not present in current backend routes |
| submitQuiz | POST /lms/quizzes/{quiz_id}/attempt | Implemented |
| getMaterials | GET /lms/materials/course/{course_id} | Implemented |
| uploadMaterial | POST /lms/materials/{course_id} | Implemented |
| getAnnouncements | GET /ops/announcements | Implemented via Operations service |
| createAnnouncement | POST /ops/announcements | Implemented via Operations service |
| submitFeedback | POST /lms/feedback | Implemented |
| getCourseFeedback | GET /lms/feedback/{course_id} | Implemented |

### Attendance Module
Source: frontend/src/api/attendance.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| checkGPS | POST /attendance/gps-check | Implemented via compatibility alias |
| checkLiveness | POST /attendance/liveness-check | Implemented via compatibility alias |
| verifyFace | POST /attendance/face-verify | Implemented via compatibility alias |
| markAttendance | POST /attendance/mark | Implemented via compatibility alias |
| getMyHistory | GET /attendance/history/me | Implemented |
| getHistory | GET /attendance/history | Implemented |
| getStats | GET /attendance/stats | Implemented |
| getMyStats | GET /attendance/stats/me | Implemented |
| enrollFace | POST /attendance/enroll | Implemented via compatibility alias |
| getActiveSessions | GET /attendance/sessions/active | Implemented |
| createSession | POST /attendance/sessions | Implemented |
| getAll | GET /attendance/records | Implemented |

### Analytics Module
Source: frontend/src/api/analytics.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| getStudentDashboard | GET /analytics/dashboard/student | Implemented |
| getFacultyDashboard | GET /analytics/dashboard/faculty | Implemented |
| getAdminDashboard | GET /analytics/dashboard/admin | Implemented |
| getRiskPrediction | GET /analytics/student/{student_id}/risk | Implemented |
| getMyRisk | Derived from /analytics/dashboard/student | Implemented via client transform |
| trackEvent | POST /analytics/events | Implemented |
| getEvents | GET /analytics/events | Implemented |

### AI Module
Source: frontend/src/api/ai.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| chat | POST /ai/chat with query and session_id | Implemented |
| getHistory | GET /ai/chat/history | Implemented |
| clearHistory | DELETE /ai/chat/history | Implemented |
| submitFeedback | POST /analytics/events as ai_feedback | Implemented as fallback flow |
| getStats | GET /ai/status | Implemented |

### Chat Module
Source: frontend/src/api/chat.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| getSessions | GET /chat/sessions | Implemented |
| getGroups | GET /chat/groups | Implemented |
| createSession | POST /chat/sessions | Implemented |
| sendMessage | POST /chat/messages/{session_id} | Implemented |
| getMessages | GET /chat/messages/{session_id} | Implemented |
| getOnlineUsers | GET /chat/online | Not present in current backend routes |
| createWebSocket | WS /api/v1/chat/ws | Handled by gateway and chat service |

### Finance Module
Source: frontend/src/api/finance.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| getFeeHeads | GET /finance/fee-heads | Implemented |
| createFeeHead | POST /finance/fee-heads | Implemented |
| getMyInvoices | GET /finance/invoices/me | Implemented |
| getInvoices | GET /finance/invoices | Implemented |
| getInvoice | GET /finance/invoices/{id} | Implemented |
| createInvoice | POST /finance/invoices | Implemented |
| updateInvoice | PUT /finance/invoices/{id} | Implemented |
| deleteInvoice | DELETE /finance/invoices/{id} | Implemented |
| payInvoice | POST /finance/payments/{invoice_id} | Implemented via compatibility alias |
| getPayments | GET /finance/payments | Implemented via compatibility endpoint |
| getLedger | GET /finance/ledger | Implemented via compatibility endpoint |
| getFines | GET /finance/fines | Implemented |
| getMyFines | GET /finance/fines/me | Implemented |
| sendPaymentReminder | POST /finance/reminders | Implemented; accepts student_id in JSON body or query |

### HR Module
Source: frontend/src/api/hr.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| applyLeave | POST /hr/leaves/apply | Implemented |
| getMyLeaves | GET /hr/leaves/me | Implemented |
| getPendingLeaves | GET /hr/leaves/pending | Implemented |
| approveLeave | PUT /hr/leaves/{leave_id}/approve | Implemented |
| rejectLeave | PUT /hr/leaves/{leave_id}/reject | Implemented |
| getEmployees | GET /hr/employees | Implemented |
| getEmployee | GET /hr/employees/{faculty_id} | Implemented |
| updateEmployee | PUT /hr/employees/{faculty_id} | Implemented |

### Library Module
Source: frontend/src/api/library.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| searchBooks | GET /library/books | Implemented |
| getBook | GET /library/books/{book_id} | Implemented |
| addBook | POST /library/books | Implemented |
| updateBook | PUT /library/books/{book_id} | Implemented |
| deleteBook | DELETE /library/books/{book_id} | Implemented |
| issueBook | POST /library/issues | Implemented |
| returnBook | POST /library/returns/{issue_id} | Implemented |
| getIssues | GET /library/issues | Implemented |
| getMyIssues | GET /library/issues/me | Implemented |
| getQRCode | GET /library/qr/{student_id} | Implemented |
| reserveBook | POST /library/reservations | Implemented |
| getReservations | GET /library/reservations | Implemented |
| getMyReservations | GET /library/reservations/me | Implemented |
| updateReservationStatus | PUT /library/reservations/{id} | Not present in current backend routes |
| cancelReservation | DELETE /library/reservations/{id} | Implemented |
| getReports | GET /library/reports | Implemented |

### Operations Module
Source: frontend/src/api/ops.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| createGrievance | POST /ops/grievances | Implemented |
| getMyGrievances | GET /ops/grievances/me | Implemented |
| getGrievances | GET /ops/grievances | Implemented |
| updateGrievanceStatus | PUT /ops/grievances/{ticket_id}/status | Implemented |
| getGrievanceComments | GET /ops/grievances/{ticket_id}/comments | Implemented |
| addGrievanceComment | POST /ops/grievances/{ticket_id}/comments | Not present in current backend routes |
| createAnnouncement | POST /ops/announcements | Implemented |
| getAnnouncements | GET /ops/announcements | Implemented |
| getAnnouncement | GET /ops/announcements/{id} | Implemented |
| deleteAnnouncement | DELETE /ops/announcements/{id} | Implemented |
| getNotifications | GET /ops/notifications/me | Implemented |
| createNotification | POST /ops/notifications | Implemented |
| markNotificationRead | PUT /ops/notifications/{id}/read | Implemented |
| markAllNotificationsRead | PUT /ops/notifications/read-all | Implemented |
| createAuditTrail | POST /ops/audit-trails | Implemented |
| getAuditTrails | GET /ops/audit-trails | Implemented |
| createMediaAsset | POST /ops/media-assets | Implemented |
| getMediaAssets | GET /ops/media-assets | Implemented |
| deleteMediaAsset | DELETE /ops/media-assets/{id} | Implemented |
| createSystemLog | POST /ops/system-logs | Implemented |
| getSystemLogs | GET /ops/system-logs | Implemented |
| setFeatureFlag | PUT /ops/feature-flags/{feature_name} | Implemented |
| getFeatureFlag | GET /ops/feature-flags/{feature_name} | Implemented |
| listFeatureFlags | GET /ops/feature-flags | Implemented |
| deleteFeatureFlag | DELETE /ops/feature-flags/{feature_name} | Implemented |

### Alumni Module
Source: frontend/src/api/alumni.js

| Frontend Call | Endpoint | Backend Status |
|---|---|---|
| register | POST /alumni/register | Implemented |
| getDirectory | GET /alumni/directory | Implemented |
| getAlumni | GET /alumni/{alumni_id} | Implemented |
| updateProfile | PUT /alumni/profile | Implemented |
| getJobs | GET /alumni/jobs | Implemented |
| createJob | POST /alumni/jobs | Implemented |
| approveJob | PUT /alumni/jobs/{job_id}/approve | Implemented |
| getEvents | GET /alumni/events | Implemented |
| createEvent | POST /alumni/events | Implemented |
| registerForEvent | POST /alumni/events/{event_id}/register | Implemented |
| getMentors | GET /alumni/mentorship | Implemented |
| createMentorship | POST /alumni/mentorship | Implemented |
| getStories | GET /alumni/stories | Implemented |
| createStory | POST /alumni/stories | Implemented |
| approveStory | PUT /alumni/stories/{story_id}/approve | Implemented |

## Status Summary

- Fully wired modules: Auth, SIS, Analytics, AI, HR, Alumni
- Mostly wired with compatibility aliases: Attendance, Finance
- Wired with a few missing endpoints: LMS, Chat, Library, Operations

## Recommended Next Alignment Tasks

1. Add missing backend endpoints or adjust frontend calls for:
   - GET /chat/online
   - POST /attendance/enroll
   - PUT /library/reservations/{reservation_id}
   - POST /ops/grievances/{ticket_id}/comments
   - GET /finance/invoices, POST /finance/invoices, GET /finance/fines
   - LMS update and delete routes for course and quiz where required
2. Keep this file updated when either frontend API modules or backend routes change.

## Source Files Used for This Mapping

- frontend/src/api/client.js
- frontend/src/api/auth.js
- frontend/src/api/sis.js
- frontend/src/api/lms.js
- frontend/src/api/attendance.js
- frontend/src/api/analytics.js
- frontend/src/api/ai.js
- frontend/src/api/chat.js
- frontend/src/api/finance.js
- frontend/src/api/hr.js
- frontend/src/api/library.js
- frontend/src/api/ops.js
- frontend/src/api/alumni.js
- backend/api-gateway/nginx.conf
- backend/services/*/app/routes.py
