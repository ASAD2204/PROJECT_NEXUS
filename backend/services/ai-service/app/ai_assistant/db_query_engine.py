"""
DB Query Engine — Real-time PostgreSQL data access for the AI assistant.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# We use raw asyncpg for read-only queries — lightweight and fast.

_pool = None


async def _get_pool(database_url: str):
    """Lazy-initialise and return an asyncpg connection pool."""
    global _pool
    if _pool is None:
        import asyncpg
        _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=5)
    return _pool


# ---------------------------------------------------------------------------
# Helper resolvers
# ---------------------------------------------------------------------------

async def resolve_student_id(pool, user_id: str) -> Optional[int]:
    """Resolve auth user UUID → sis_students.student_id."""
    row = await pool.fetchrow(
        "SELECT student_id FROM sis_students WHERE user_id = $1", user_id
    )
    return row["student_id"] if row else None


async def resolve_faculty_id(pool, user_id: str) -> Optional[int]:
    """Resolve auth user UUID → sis_faculty.faculty_id."""
    row = await pool.fetchrow(
        "SELECT faculty_id FROM sis_faculty WHERE user_id = $1", user_id
    )
    return row["faculty_id"] if row else None


async def resolve_librarian_id(pool, user_id: str) -> Optional[int]:
    """Resolve auth user UUID → lib_librarian_profiles.librarian_profile_id."""
    row = await pool.fetchrow(
        "SELECT librarian_profile_id FROM lib_librarian_profiles WHERE user_id = $1", user_id
    )
    return row["librarian_profile_id"] if row else None


async def resolve_alumni_id(pool, user_id: str) -> Optional[int]:
    """Resolve auth user UUID → alumni_registry.alumni_id."""
    # alumni_registry links via student_id, which links to user_id
    row = await pool.fetchrow("""
        SELECT a.alumni_id 
        FROM alumni_registry a
        JOIN sis_students s ON s.student_id = a.student_id
        WHERE s.user_id = $1
    """, user_id)
    return row["alumni_id"] if row else None


# ---------------------------------------------------------------------------
# Student queries
# ---------------------------------------------------------------------------

async def get_student_profile(pool, student_id: int) -> dict:
    row = await pool.fetchrow("""
        SELECT s.student_id, s.roll_no, s.current_semester, s.current_risk_status,
               s.phone, s.blood_group, s.guardian_name,
               u.first_name, u.last_name, u.email,
             p.title AS program_name, d.name AS department_name
        FROM sis_students s
        JOIN auth_users u ON u.user_id = s.user_id
        LEFT JOIN sis_programs p ON p.program_id = s.program_id
        LEFT JOIN sis_departments d ON d.dept_id = p.dept_id
        WHERE s.student_id = $1
    """, student_id)
    return dict(row) if row else {}


async def get_student_gpa(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT t.sgpa, t.cgpa, sem.title AS semester
        FROM sis_transcripts t
        JOIN sis_semesters sem ON sem.semester_id = t.semester_id
        WHERE t.student_id = $1
        ORDER BY sem.start_date DESC
    """, student_id)
    return [dict(r) for r in rows]


async def get_student_attendance(pool, student_id: int) -> dict:
    row = await pool.fetchrow("""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
               SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent
        FROM lms_attendance
        WHERE student_id = $1
    """, student_id)
    return dict(row) if row else {}


async def get_student_course_attendance(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT c.code, c.title,
               COUNT(a.attendance_id) AS total,
               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
               SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent
        FROM lms_courses c
        JOIN sis_enrollments e ON e.course_id = c.course_id
        LEFT JOIN lms_attendance a ON a.course_id = c.course_id AND a.student_id = $1
        WHERE e.student_id = $1
        GROUP BY c.course_id, c.code, c.title
        ORDER BY c.code
    """, student_id)
    return [dict(r) for r in rows]


async def get_student_courses(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT c.code, c.title, c.credit_hours, c.course_id,
               CONCAT(u.first_name, ' ', u.last_name) AS instructor,
               e.status AS enrollment_status, e.midterm_marks, e.finalterm_marks,
               e.sessional_marks, e.final_grade_points
        FROM sis_enrollments e
        JOIN lms_courses c ON c.course_id = e.course_id
        LEFT JOIN sis_faculty f ON f.faculty_id = c.faculty_id
        LEFT JOIN auth_users u ON u.user_id = f.user_id
        WHERE e.student_id = $1
        ORDER BY c.code
    """, student_id)
    return [dict(r) for r in rows]


async def get_student_pending_fees(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT i.invoice_id, i.total_amount, i.due_date, i.status,
               sem.title AS semester
        FROM fin_invoices i
        JOIN sis_semesters sem ON sem.semester_id = i.semester_id
        WHERE i.student_id = $1 AND i.status IN ('Unpaid', 'Overdue')
        ORDER BY i.due_date
    """, student_id)
    return [dict(r) for r in rows]


async def get_student_upcoming_deadlines(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT a.title, a.due_date, c.code AS course_code,
               CASE WHEN sub.sub_id IS NOT NULL THEN 'Submitted' ELSE 'Pending' END AS status
        FROM lms_assignments a
        JOIN lms_courses c ON c.course_id = a.course_id
        JOIN sis_enrollments e ON e.course_id = c.course_id AND e.student_id = $1
        LEFT JOIN lms_submissions sub ON sub.assignment_id = a.assignment_id AND sub.student_id = $1
        WHERE a.due_date >= NOW()
        ORDER BY a.due_date
        LIMIT 10
    """, student_id)
    return [dict(r) for r in rows]


async def get_student_quiz_scores(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT q.title AS quiz_title, c.code AS course_code,
               SUM(ans.score_obtained) AS score
        FROM lms_answers ans
        JOIN lms_quizzes q ON q.quiz_id = ans.quiz_id
        JOIN lms_courses c ON c.course_id = q.course_id
        WHERE ans.student_id = $1
        GROUP BY q.quiz_id, q.title, c.code
        ORDER BY q.quiz_id DESC
        LIMIT 10
    """, student_id)
    return [dict(r) for r in rows]


async def get_transcript_summary(pool, student_id: int) -> dict:
    """Fetch academic history summary for a student/alumnus."""
    gpas = await pool.fetch("""
        SELECT t.sgpa, sem.title AS semester
        FROM sis_transcripts t
        JOIN sis_semesters sem ON sem.semester_id = t.semester_id
        WHERE t.student_id = $1
        ORDER BY sem.start_date ASC
    """, student_id)
    
    courses = await pool.fetch("""
        SELECT c.title, c.credit_hours, e.final_grade_points
        FROM sis_enrollments e
        JOIN lms_courses c ON c.course_id = e.course_id
        WHERE e.student_id = $1 AND e.status = 'Completed'
    """, student_id)
    
    total_credits = sum(c['credit_hours'] for c in courses)
    # Strongest subjects are those with highest grade points
    strong_subjects = sorted(courses, key=lambda x: x['final_grade_points'] or 0, reverse=True)[:5]
    
    return {
        "sgpas": [dict(g) for g in gpas],
        "total_credits": total_credits,
        "strongest_subjects": [s['title'] for s in strong_subjects],
        "cgpa": sum(g['sgpa'] for g in gpas) / len(gpas) if gpas else 0.0
    }


# ---------------------------------------------------------------------------
# Faculty queries
# ---------------------------------------------------------------------------

async def get_faculty_courses(pool, faculty_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT c.course_id, c.code, c.title, c.credit_hours,
               c.room_no, c.capacity,
               (SELECT COUNT(*) FROM sis_enrollments e WHERE e.course_id = c.course_id) AS enrolled
        FROM lms_courses c
        WHERE c.faculty_id = $1
        ORDER BY c.code
    """, faculty_id)
    return [dict(r) for r in rows]


async def get_course_at_risk_students(pool, course_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT s.roll_no, u.first_name, u.last_name, s.current_risk_status,
               COUNT(CASE WHEN a.status = 'Absent' THEN 1 END)::int AS absences
        FROM sis_enrollments e
        JOIN sis_students s ON s.student_id = e.student_id
        JOIN auth_users u ON u.user_id = s.user_id
        LEFT JOIN lms_attendance a ON a.student_id = s.student_id AND a.course_id = $1
        WHERE e.course_id = $1 AND s.current_risk_status IN ('Yellow', 'Red')
        GROUP BY s.student_id, s.roll_no, u.first_name, u.last_name, s.current_risk_status
        ORDER BY s.current_risk_status DESC
    """, course_id)
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Librarian queries
# ---------------------------------------------------------------------------

async def get_library_stats(pool) -> dict:
    total_books = await pool.fetchval("SELECT COUNT(*) FROM lib_books")
    issued_books = await pool.fetchval("SELECT COUNT(*) FROM lib_issues WHERE status = 'Issued'")
    reservations = await pool.fetchval("SELECT COUNT(*) FROM lib_reservations WHERE status = 'Active'")
    return {
        "total_books": total_books,
        "issued_books": issued_books,
        "active_reservations": reservations,
    }


async def find_books(pool, query: str) -> list[dict]:
    # Simple keyword search on title/author/isbn
    rows = await pool.fetch("""
        SELECT isbn, title, author, available_copies, total_copies, shelf_location
        FROM lib_books
        WHERE title ILIKE $1 OR author ILIKE $1 OR isbn ILIKE $1
        LIMIT 5
    """, f"%{query}%")
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Alumni queries
# ---------------------------------------------------------------------------

async def get_alumni_profile(pool, alumni_id: int) -> dict:
    row = await pool.fetchrow("""
        SELECT a.*, u.first_name, u.last_name, u.email
        FROM alumni_registry a
        JOIN sis_students s ON s.student_id = a.student_id
        JOIN auth_users u ON u.user_id = s.user_id
        WHERE a.alumni_id = $1
    """, alumni_id)
    return dict(row) if row else {}


async def get_latest_jobs(pool) -> list[dict]:
    rows = await pool.fetch("""
        SELECT title, company, location, job_type, posted_at
        FROM alumni_jobs
        WHERE is_active = TRUE AND status = 'Approved'
        ORDER BY posted_at DESC
        LIMIT 5
    """)
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Admin queries
# ---------------------------------------------------------------------------

async def get_admin_stats(pool) -> dict:
    """Quick dashboard stats for admin."""
    students = await pool.fetchval("SELECT COUNT(*) FROM sis_students")
    faculty = await pool.fetchval("SELECT COUNT(*) FROM sis_faculty")
    courses = await pool.fetchval("SELECT COUNT(*) FROM lms_courses")
    active_sem = await pool.fetchrow(
        "SELECT title FROM sis_semesters WHERE is_active = TRUE LIMIT 1"
    )
    revenue = await pool.fetchval("""
        SELECT COALESCE(SUM(amount_paid), 0) FROM fin_transactions
        WHERE trx_date >= date_trunc('month', CURRENT_DATE)
    """)
    at_risk = await pool.fetchval(
        "SELECT COUNT(*) FROM sis_students WHERE current_risk_status IN ('Yellow','Red')"
    )
    return {
        "total_students": students,
        "total_faculty": faculty,
        "total_courses": courses,
        "active_semester": active_sem["title"] if active_sem else "N/A",
        "monthly_revenue": float(revenue),
        "at_risk_students": at_risk,
    }


# ---------------------------------------------------------------------------
# Student queries (Omniscient Expansion)
# ---------------------------------------------------------------------------

async def get_student_timetable(pool, student_id: int) -> list[dict]:
    """Fetch the weekly schedule for a student."""
    rows = await pool.fetch("""
        SELECT t.day_of_week, t.start_time, t.end_time,
               c.code AS course_code, c.title AS course_title,
               r.room_no, r.building
        FROM lms_timetable_slots t
        JOIN lms_sections s ON s.section_id = t.section_id
        JOIN lms_courses c ON c.course_id = s.course_id
        JOIN sis_enrollments e ON e.course_id = c.course_id
        LEFT JOIN sis_classrooms r ON r.room_id = t.room_id
        WHERE e.student_id = $1 AND e.status = 'Enrolled'
        ORDER BY CASE t.day_of_week 
            WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 
            WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
            t.start_time
    """, student_id)
    return [dict(r) for r in rows]


async def get_student_instructors(pool, student_id: int) -> list[dict]:
    """Get list of professors teaching the student."""
    rows = await pool.fetch("""
        SELECT DISTINCT u.first_name, u.last_name, u.email,
               c.title AS course, f.designation
        FROM sis_enrollments e
        JOIN lms_courses c ON c.course_id = e.course_id
        JOIN sis_faculty f ON f.faculty_id = c.faculty_id
        JOIN auth_users u ON u.user_id = f.user_id
        WHERE e.student_id = $1
    """, student_id)
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Faculty queries (Omniscient Expansion)
# ---------------------------------------------------------------------------

async def get_faculty_timetable(pool, faculty_id: int) -> list[dict]:
    """Fetch the teaching schedule for a professor."""
    rows = await pool.fetch("""
        SELECT t.day_of_week, t.start_time, t.end_time,
               c.code AS course_code, c.title AS course_title,
               r.room_no, sec.name AS section_name
        FROM lms_timetable_slots t
        JOIN lms_sections sec ON sec.section_id = t.section_id
        JOIN lms_courses c ON c.course_id = sec.course_id
        LEFT JOIN sis_classrooms r ON r.room_id = t.room_id
        WHERE c.faculty_id = $1
        ORDER BY t.start_time
    """, faculty_id)
    return [dict(r) for r in rows]


async def get_grading_backlog(pool, faculty_id: int) -> list[dict]:
    """Identify assignments pending marks."""
    rows = await pool.fetch("""
        SELECT a.title AS assignment, c.code AS course,
               COUNT(sub.sub_id) AS pending_count
        FROM lms_assignments a
        JOIN lms_courses c ON c.course_id = a.course_id
        JOIN lms_submissions sub ON sub.assignment_id = a.assignment_id
        WHERE c.faculty_id = $1 AND sub.marks_obtained IS NULL
        GROUP BY a.assignment_id, a.title, c.code
    """, faculty_id)
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Librarian queries (Omniscient Expansion)
# ---------------------------------------------------------------------------

async def get_overdue_reports(pool) -> list[dict]:
    """List all students with overdue books."""
    rows = await pool.fetch("""
        SELECT b.title, u.first_name, u.last_name, i.due_date,
               CURRENT_DATE - i.due_date::date AS days_overdue
        FROM lib_issues i
        JOIN lib_books b ON b.book_id = i.book_id
        JOIN sis_students s ON s.student_id = i.student_id
        JOIN auth_users u ON u.user_id = s.user_id
        WHERE i.status = 'Issued' AND i.due_date < CURRENT_DATE
        ORDER BY days_overdue DESC
    """)
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Alumni queries (Omniscient Expansion)
# ---------------------------------------------------------------------------

async def get_alumni_mentorship_stats(pool, alumni_id: int) -> dict:
    """Summary of mentorship involvement."""
    requests = await pool.fetchval("""
        SELECT COUNT(*) FROM alumni_mentorship 
        WHERE mentor_id = $1 AND status = 'Pending'
    """, alumni_id)
    return {"pending_requests": requests}


# ---------------------------------------------------------------------------
# Admin queries (Omniscient Expansion)
# ---------------------------------------------------------------------------

async def get_departmental_revenue(pool) -> list[dict]:
    """Breakdown of fee collection by department."""
    rows = await pool.fetch("""
        SELECT d.name AS department, SUM(t.amount_paid) AS total_revenue
        FROM fin_transactions t
        JOIN fin_invoices i ON i.invoice_id = t.invoice_id
        JOIN sis_students s ON s.student_id = i.student_id
        JOIN sis_programs p ON p.program_id = s.program_id
        JOIN sis_departments d ON d.dept_id = p.dept_id
        GROUP BY d.name
        ORDER BY total_revenue DESC
    """)
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Admin queries (Omniscient Master Expansion)
# ---------------------------------------------------------------------------

async def get_admin_dashboard_summary(pool) -> dict:
    """Master institutional overview."""
    programs = await pool.fetchval("SELECT COUNT(*) FROM sis_programs")
    depts = await pool.fetchval("SELECT COUNT(*) FROM sis_departments")
    students = await pool.fetchval("SELECT COUNT(*) FROM sis_students")
    faculty = await pool.fetchval("SELECT COUNT(*) FROM sis_faculty")
    librarians = await pool.fetchval("SELECT COUNT(*) FROM lib_librarian_profiles")
    courses = await pool.fetchval("SELECT COUNT(*) FROM lms_courses")
    revenue = await pool.fetchval("SELECT COALESCE(SUM(amount_paid), 0) FROM fin_transactions")
    
    return {
        "programs": programs,
        "departments": depts,
        "students": students,
        "faculty": faculty,
        "librarians": librarians,
        "total_staff": faculty + librarians,
        "courses": courses,
        "total_revenue": float(revenue)
    }


async def get_admin_staff_details(pool) -> list[dict]:
    """Breakdown of staff roles."""
    faculty = await pool.fetch("""
        SELECT u.first_name, u.last_name, 'Faculty' as role, f.designation, d.name as department
        FROM sis_faculty f
        JOIN auth_users u ON u.user_id = f.user_id
        LEFT JOIN sis_departments d ON d.dept_id = f.dept_id
    """)
    librarians = await pool.fetch("""
        SELECT u.first_name, u.last_name, 'Librarian' as role, 'Staff' as designation, 'Library' as department
        FROM lib_librarian_profiles l
        JOIN auth_users u ON u.user_id = l.user_id
    """)
    return [dict(r) for r in faculty] + [dict(r) for r in librarians]


# ---------------------------------------------------------------------------
# Main query dispatcher
# ---------------------------------------------------------------------------

class DBQueryEngine:
    """Dispatches natural-language–detected intents to structured DB queries."""

    def __init__(self, database_url: str):
        self.database_url = database_url

    async def _pool(self):
        return await _get_pool(self.database_url)

    async def get_user_context_summary(self, user_id: str, role: str) -> str:
        """Fetch a brief background summary of the user to personalize the AI."""
        pool = await self._pool()
        role = role.lower()
        try:
            if role == "student":
                student_id = await resolve_student_id(pool, user_id)
                if not student_id: return ""
                
                profile = await get_student_profile(pool, student_id)
                transcript = await get_transcript_summary(pool, student_id)
                att = await get_student_attendance(pool, student_id)
                fees = await get_student_pending_fees(pool, student_id)
                
                att_pct = round(att["present"] / att["total"] * 100, 1) if att.get("total") else "N/A"
                fee_status = f"PKR {sum(f['total_amount'] for f in fees):,.2f} due" if fees else "Clear"

                return (
                    f"USER CONTEXT:\n- Student: {profile.get('first_name')} {profile.get('last_name')}\n"
                    f"- Program: {profile.get('program_name')} (Sem {profile.get('current_semester')})\n"
                    f"- GPA: {transcript['cgpa']:.2f}, Attendance: {att_pct}%, Fees: {fee_status}"
                )
            elif role in ("faculty", "teacher"):
                faculty_id = await resolve_faculty_id(pool, user_id)
                if not faculty_id: return ""
                courses = await get_faculty_courses(pool, faculty_id)
                backlog = await get_grading_backlog(pool, faculty_id)
                pending = sum(b['pending_count'] for b in backlog)
                return f"USER CONTEXT: Faculty teaching {len(courses)} courses. Pending Grading: {pending} assignments."
                
            elif role == "librarian":
                stats = await get_library_stats(pool)
                overdue = await get_overdue_reports(pool)
                return f"USER CONTEXT: Librarian. Overdue books: {len(overdue)}. Inventory: {stats['total_books']}."

            elif role == "alumni":
                alumni_id = await resolve_alumni_id(pool, user_id)
                if not alumni_id: return ""
                profile = await get_alumni_profile(pool, alumni_id)
                return f"USER CONTEXT: Alumni ({profile.get('degree')}, '{profile.get('grad_year')}). {profile.get('current_position')} at {profile.get('current_employer')}."

            elif role in ("admin", "superadmin", "hod"):
                stats = await get_admin_dashboard_summary(pool)
                return f"USER CONTEXT: Admin. Monitoring {stats['students']} students, {stats['faculty']} faculty, and {stats['departments']} departments."

        except Exception as e:
            logger.error(f"Context fetch error: {e}")
        return ""

    async def query(self, intent_text: str, user_id: str, role: str) -> Optional[str]:
        pool = await self._pool()
        role = role.lower()
        q = intent_text.lower()

        if role == "student":
            sid = await resolve_student_id(pool, user_id)
            if not sid: return None

            if any(k in q for k in ["timetable", "schedule", "class"]):
                data = await get_student_timetable(pool, sid)
                if not data: return "Your timetable is currently empty."
                lines = [f"| {r['day_of_week']} | {r['start_time']} | {r['course_code']} | {r['room_no']} |" for r in data]
                return "**Your Timetable:**\n| Day | Time | Course | Room |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)

            if any(k in q for k in ["teacher", "instructor", "professor"]):
                data = await get_student_instructors(pool, sid)
                lines = [f"| {r['first_name']} {r['last_name']} | {r['course']} | {r['email']} |" for r in data]
                return "**Your Instructors:**\n| Name | Course | Contact |\n| :--- | :--- | :--- |\n" + "\n".join(lines)

            return await self._student_query(pool, intent_text, sid)

        elif role in ("faculty", "teacher"):
            fid = await resolve_faculty_id(pool, user_id)
            if not fid: return None

            if any(k in q for k in ["timetable", "schedule", "my classes"]):
                data = await get_faculty_timetable(pool, fid)
                lines = [f"| {r['day_of_week']} | {r['start_time']} | {r['course_title']} | {r['room_no']} |" for r in data]
                return "**Teaching Schedule:**\n| Day | Time | Course | Room |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)

            if any(k in q for k in ["grading", "pending", "check"]):
                data = await get_grading_backlog(pool, fid)
                if not data: return "Excellent! You have no assignments pending grading."
                lines = [f"| {r['assignment']} | {r['course']} | {r['pending_count']} |" for r in data]
                return "**Grading Backlog:**\n| Assignment | Course | Pending Submissions |\n| :--- | :--- | :--- |\n" + "\n".join(lines)

            return await self._faculty_query(pool, intent_text, fid)

        elif role == "librarian":
            if any(k in q for k in ["overdue", "late"]):
                data = await get_overdue_reports(pool)
                if not data: return "There are currently no overdue books."
                lines = [f"| {r['title']} | {r['first_name']} {r['last_name']} | {r['due_date']} | {r['days_overdue']} |" for r in data]
                return "**Overdue Books Report:**\n| Title | Student | Due Date | Days Late |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)
            
            return await self._librarian_query(pool, intent_text)

        elif role in ("admin", "superadmin", "hod"):
            if any(k in q for k in ["dashboard", "overview", "stats", "summary"]):
                data = await get_admin_dashboard_summary(pool)
                return (
                    f"**Institutional Master Dashboard:**\n"
                    f"- **Programs:** {data['programs']} active programs\n"
                    f"- **Departments:** {data['departments']} academic units\n"
                    f"- **Students:** {data['students']} total enrollment\n"
                    f"- **Staff:** {data['faculty']} Faculty | {data['librarians']} Librarians\n"
                    f"- **Financials:** PKR {data['total_revenue']:,.2f} (Gross Revenue)"
                )
            
            if any(k in q for k in ["revenue", "money", "collection"]):
                data = await get_departmental_revenue(pool)
                lines = [f"| {r['department']} | PKR {r['total_revenue']:,.2f} |" for r in data]
                return "**Departmental Revenue Breakdown:**\n| Department | Total Revenue |\n| :--- | :--- |\n" + "\n".join(lines)
            
            if any(k in q for k in ["staff", "faculty", "teachers", "employees"]):
                data = await get_admin_staff_details(pool)
                lines = [f"| {r['first_name']} {r['last_name']} | {r['role']} | {r['designation']} | {r['department']} |" for r in data]
                return "**Staff Registry:**\n| Name | Role | Designation | Unit |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)

            return await self._admin_query(pool, intent_text)

        return None

    async def _student_query(self, pool, intent: str, student_id: int) -> Optional[str]:
        intent_lower = intent.lower()

        if any(k in intent_lower for k in ["gpa", "grade", "cgpa", "transcript", "marks", "midterm", "finalterm", "sessional"]):
            gpas = await get_student_gpa(pool, student_id)
            courses = await get_student_courses(pool, student_id)
            
            response = ""
            if gpas:
                lines = [f"| {r['semester']} | {r['sgpa']:.2f} | {r['cgpa']:.2f} |" for r in gpas]
                response += "**Semester GPAs:**\n| Semester | SGPA | CGPA |\n| :--- | :--- | :--- |\n" + "\n".join(lines) + "\n\n"
            
            if courses:
                lines = []
                for r in courses:
                    mid = f"{r['midterm_marks']:.1f}" if r['midterm_marks'] is not None else "-"
                    fin = f"{r['finalterm_marks']:.1f}" if r['finalterm_marks'] is not None else "-"
                    sess = f"{r['sessional_marks']:.1f}" if r['sessional_marks'] is not None else "-"
                    gp = f"{r['final_grade_points']:.2f}" if r['final_grade_points'] is not None else "-"
                    lines.append(f"| {r['code']} | {r['title']} | {mid} | {fin} | {sess} | {gp} |")
                response += "**Course Grades & Marks:**\n| Code | Title | Mid | Final | Sessional | GP |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n" + "\n".join(lines)
                
            return response or "No academic records found in the database."

        if any(k in intent_lower for k in ["attendance"]):
            data = await get_student_course_attendance(pool, student_id)
            if not data: return "No attendance records found."
            lines = []
            for r in data:
                pct = round(r["present"] / r["total"] * 100, 1) if r["total"] > 0 else 0.0
                lines.append(f"| {r['code']} | {r['title']} | {r['present']}/{r['total']} | {pct}% |")
            return "**Course Attendance Summary:**\n| Code | Course Title | Present/Total | Percentage |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["course", "enrolled", "class"]):
            data = await get_student_courses(pool, student_id)
            if not data: return "You are not currently enrolled in any courses."
            lines = [f"| {r['code']} | {r['title']} | {r['instructor']} |" for r in data]
            return "**Current Enrolments:**\n| Code | Title | Instructor |\n| :--- | :--- | :--- |\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["fee", "invoice", "payment", "due", "finance", "dues", "unpaid"]):
            data = await get_student_pending_fees(pool, student_id)
            if not data: return "Great news! You have no pending fees or unpaid invoices."
            lines = [f"| {r['invoice_id']} | PKR {r['total_amount']:.2f} | {r['due_date']} | {r['status']} |" for r in data]
            return "**Pending Invoices:**\n| ID | Amount | Due Date | Status |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["deadline", "assignment", "task", "upcoming"]):
            data = await get_student_upcoming_deadlines(pool, student_id)
            if not data: return "No upcoming deadlines found. You're all caught up!"
            lines = [f"| {r['title']} | {r['course_code']} | {r['due_date']} | {r['status']} |" for r in data]
            return "**Upcoming Deadlines:**\n| Assignment | Course | Due Date | Status |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["quiz", "score", "result"]):
            data = await get_student_quiz_scores(pool, student_id)
            if not data: return "No quiz scores recorded yet."
            lines = [f"| {r['quiz_title']} | {r['course_code']} | {r['score']} |" for r in data]
            return "**Quiz Performance:**\n| Quiz | Course | Score |\n| :--- | :--- | :--- |\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["profile", "my details", "my info", "roll", "registration", "guardian", "blood", "phone", "email"]):
            p = await get_student_profile(pool, student_id)
            if not p: return "No profile records found in the database."
            return (
                f"**Your Profile Details:**\n"
                f"- **Full Name:** {p.get('first_name', '')} {p.get('last_name', '')}\n"
                f"- **Roll No:** {p.get('roll_no', 'N/A')}\n"
                f"- **Program:** {p.get('program_name', 'N/A')} (Semester {p.get('current_semester', 'N/A')})\n"
                f"- **Department:** {p.get('department_name', 'N/A')}\n"
                f"- **Email:** {p.get('email', 'N/A')}\n"
                f"- **Phone:** {p.get('phone', 'N/A')}\n"
                f"- **Guardian Name:** {p.get('guardian_name', 'N/A')}\n"
                f"- **Blood Group:** {p.get('blood_group', 'N/A')}\n"
                f"- **Risk Status:** {p.get('current_risk_status', 'Green')}"
            )

        return None

    async def _faculty_query(self, pool, intent: str, faculty_id: int) -> Optional[str]:
        intent_lower = intent.lower()

        if any(k in intent_lower for k in ["course", "class", "teaching"]):
            data = await get_faculty_courses(pool, faculty_id)
            if not data: return "You are not assigned to any courses this semester."
            lines = [f"| {r['code']} | {r['title']} | {r['enrolled']}/{r['capacity']} | {r['room_no']} |" for r in data]
            return "**Assigned Courses:**\n| Code | Title | Enrolled | Room |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["at risk", "weak", "danger"]):
            courses = await get_faculty_courses(pool, faculty_id)
            all_risks = []
            for c in courses:
                risks = await get_course_at_risk_students(pool, c["course_id"])
                for r in risks:
                    all_risks.append(f"| {r['roll_no']} | {r['first_name']} {r['last_name']} | {r['current_risk_status']} | {r['absences']} |")
            
            if not all_risks: return "No students are currently marked as at-risk in your courses."
            return "**At-Risk Student Monitoring:**\n| Roll No | Name | Risk Level | Absences |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(all_risks)

        return None

    async def _librarian_query(self, pool, intent: str) -> Optional[str]:
        intent_lower = intent.lower()
        if any(k in intent_lower for k in ["stats", "inventory", "summary", "overview"]):
            data = await get_library_stats(pool)
            return (
                f"**Library Operations Overview:**\n"
                f"- Total Inventory: **{data['total_books']}** books\n"
                f"- Currently Issued: **{data['issued_books']}**\n"
                f"- Active Reservations: **{data['active_reservations']}**"
            )
        
        if any(k in intent_lower for k in ["book", "find", "search", "catalog"]):
            # Simple keyword search on title/author/isbn
            books = await find_books(pool, intent)
            if not books: return "No books found in the catalog matching your search criteria."
            lines = [f"| {b['isbn']} | {b['title']} | {b['author']} | {b['available_copies']}/{b['total_copies']} |" for b in books]
            return "**Library Catalog Search:**\n| ISBN | Title | Author | Availability |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)
            
        return None

    async def _alumni_query(self, pool, intent: str, alumni_id: int) -> Optional[str]:
        intent_lower = intent.lower()
        if any(k in intent_lower for k in ["job", "career", "opening", "opportunity"]):
            jobs = await get_latest_jobs(pool)
            if not jobs: return "No active job openings found in the Nexus Alumni Network."
            lines = [f"| {j['title']} | {j['company']} | {j['location']} | {j['job_type']} |" for j in jobs]
            return "**Career Opportunities:**\n| Position | Company | Location | Type |\n| :--- | :--- | :--- | :--- |\n" + "\n".join(lines)
            
        if any(k in intent_lower for k in ["profile", "my info", "registry"]):
            p = await get_alumni_profile(pool, alumni_id)
            return (
                f"**Alumni Registry Profile:**\n"
                f"- Name: {p['first_name']} {p['last_name']}\n"
                f"- Qualification: {p['degree']} ({p['grad_year']})\n"
                f"- Current Status: {p['current_position']} at {p['current_employer']}"
            )

        return None

    async def _admin_query(self, pool, intent: str) -> Optional[str]:
        intent_lower = intent.lower()
        if any(k in intent_lower for k in ["dashboard", "stats", "revenue", "financial", "growth"]):
            data = await get_admin_stats(pool)
            return (
                f"**Institutional Intelligence Dashboard:**\n"
                f"- **Enrollment:** {data['total_students']} Students | {data['total_faculty']} Faculty\n"
                f"- **Academic:** {data['total_courses']} Courses | {data['active_semester']} Semester\n"
                f"- **Revenue (MTD):** PKR {data['monthly_revenue']:,.2f}\n"
                f"- **Operational Risk:** {data['at_risk_students']} At-Risk Students"
            )
        return None
