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
        SELECT t.sgpa AS gpa, sem.title AS semester
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


async def get_student_courses(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT c.code, c.title, c.credit_hours, c.course_id,
               CONCAT(u.first_name, ' ', u.last_name) AS instructor,
               e.status AS enrollment_status, e.final_grade_points
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
        if role == "student":
            student_id = await resolve_student_id(pool, user_id)
            if not student_id: return ""
            
            profile = await get_student_profile(pool, student_id)
            gpas = await get_student_gpa(pool, student_id)
            att = await get_student_attendance(pool, student_id)
            fees = await get_student_pending_fees(pool, student_id)
            deadlines = await get_student_upcoming_deadlines(pool, student_id)
            
            cgpa = gpas[0]["gpa"] if gpas else "N/A"
            att_pct = round(att["present"] / att["total"] * 100, 1) if att.get("total") else "N/A"
            fee_status = f"{len(fees)} pending invoices" if fees else "No pending fees"
            next_deadline = deadlines[0]["title"] if deadlines else "None"
            
            alerts = ""
            if att_pct != "N/A" and float(att_pct) < 75:
                alerts += f"\nATTENDANCE ALERT: {att_pct}% (Below university threshold of 75%)"

            return (
                f"USER CONTEXT (Background info for personalization):\n"
                f"- Name: {profile.get('first_name')} {profile.get('last_name')}\n"
                f"- Program: {profile.get('program_name')} (Semester {profile.get('current_semester')})\n"
                f"- Academic Status: CGPA {cgpa}, Attendance {att_pct}%\n"
                f"- Financials: {fee_status}\n"
                f"- Next Task: {next_deadline}\n"
                f"{alerts}"
            )
        elif role in ("faculty", "teacher"):
            faculty_id = await resolve_faculty_id(pool, user_id)
            if not faculty_id: return ""
            courses = await get_faculty_courses(pool, faculty_id)
            return f"USER CONTEXT: Faculty member teaching {len(courses)} classes."
            
        elif role == "librarian":
            lib_id = await resolve_librarian_id(pool, user_id)
            if not lib_id: return ""
            stats = await get_library_stats(pool)
            return f"USER CONTEXT: Librarian managing {stats['total_books']} books. Currently {stats['issued_books']} issued."

        elif role == "alumni":
            alumni_id = await resolve_alumni_id(pool, user_id)
            if not alumni_id: return ""
            profile = await get_alumni_profile(pool, alumni_id)
            return f"USER CONTEXT: Alumnus ({profile.get('degree')}, Class of {profile.get('grad_year')}) currently at {profile.get('current_employer')}."

        return ""

    async def query(self, intent: str, user_id: str, role: str) -> Optional[str]:
        pool = await self._pool()
        role = role.lower()

        if role == "student":
            student_id = await resolve_student_id(pool, user_id)
            if not student_id: return "Student profile not found."
            return await self._student_query(pool, intent, student_id)

        elif role in ("faculty", "teacher"):
            faculty_id = await resolve_faculty_id(pool, user_id)
            if not faculty_id: return "Faculty profile not found."
            return await self._faculty_query(pool, intent, faculty_id)

        elif role == "librarian":
            return await self._librarian_query(pool, intent)

        elif role == "alumni":
            alumni_id = await resolve_alumni_id(pool, user_id)
            if not alumni_id: return "Alumni profile not found."
            return await self._alumni_query(pool, intent, alumni_id)

        elif role in ("admin", "superadmin", "hod"):
            return await self._admin_query(pool, intent)

        return None

    async def _student_query(self, pool, intent: str, student_id: int) -> Optional[str]:
        intent_lower = intent.lower()

        if any(k in intent_lower for k in ["gpa", "grade", "cgpa"]):
            data = await get_student_gpa(pool, student_id)
            if not data: return "No records found."
            lines = [f"- {r['semester']}: GPA {r['gpa']}" for r in data]
            return "**Transcript:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["attendance"]):
            data = await get_student_attendance(pool, student_id)
            if not data or data.get("total") == 0: return "No records."
            pct = round(data["present"] / data["total"] * 100, 1)
            return f"**Attendance:** {pct}% ({data['present']}/{data['total']})"

        if any(k in intent_lower for k in ["course", "enrolled", "class"]):
            data = await get_student_courses(pool, student_id)
            if not data: return "No courses."
            lines = [f"- {r['code']} — {r['title']} ({r['instructor']})" for r in data]
            return "**Courses:**\n" + "\n".join(lines)

        return None

    async def _faculty_query(self, pool, intent: str, faculty_id: int) -> Optional[str]:
        intent_lower = intent.lower()

        if any(k in intent_lower for k in ["course", "class", "teaching"]):
            data = await get_faculty_courses(pool, faculty_id)
            if not data: return "No classes."
            lines = [f"- {r['code']} — {r['title']} ({r['enrolled']}/{r['capacity']})" for r in data]
            return "**Teaching:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["at risk", "weak"]):
            courses = await get_faculty_courses(pool, faculty_id)
            all_risks = []
            for c in courses:
                risks = await get_course_at_risk_students(pool, c["course_id"])
                for r in risks:
                    all_risks.append(f"- {r['roll_no']} {r['first_name']} — Status: {r['current_risk_status']}")
            return "**At-Risk:**\n" + "\n".join(all_risks) if all_risks else "None."

        return None

    async def _librarian_query(self, pool, intent: str) -> Optional[str]:
        intent_lower = intent.lower()
        if any(k in intent_lower for k in ["stats", "inventory", "summary"]):
            data = await get_library_stats(pool)
            return f"**Library Stats:** Total Books: {data['total_books']}, Issued: {data['issued_books']}, Active Reservations: {data['active_reservations']}"
        
        if any(k in intent_lower for k in ["book", "find", "search"]):
            # Simple keyword search on title/author/isbn
            books = await find_books(pool, intent)
            if not books: return "No books found matching that query."
            lines = [f"- {b['title']} by {b['author']} ({b['available_copies']}/{b['total_copies']} avail) @ {b['shelf_location']}" for b in books]
            return "**Search Results:**\n" + "\n".join(lines)
            
        return None

    async def _alumni_query(self, pool, intent: str, alumni_id: int) -> Optional[str]:
        intent_lower = intent.lower()
        if any(k in intent_lower for k in ["job", "career", "opening"]):
            jobs = await get_latest_jobs(pool)
            if not jobs: return "No active job openings found."
            lines = [f"- {j['title']} at {j['company']} ({j['location']})" for j in jobs]
            return "**Latest Job Openings:**\n" + "\n".join(lines)
            
        if any(k in intent_lower for k in ["profile", "my info"]):
            p = await get_alumni_profile(pool, alumni_id)
            return f"**Profile:** {p['first_name']} {p['last_name']}, {p['degree']} ({p['grad_year']}). Currently {p['current_position']} at {p['current_employer']}."

        return None

    async def _admin_query(self, pool, intent: str) -> Optional[str]:
        if "dashboard" in intent.lower() or "stats" in intent.lower():
            data = await get_admin_stats(pool)
            return f"**Stats:** Students: {data['total_students']}, Courses: {data['total_courses']}, Revenue: {data['monthly_revenue']}"
        return None
