"""
DB Query Engine — Real-time PostgreSQL data access for the AI assistant.

The assistant can query live data to answer questions like:
- "What's my GPA this semester?"
- "How many classes did I miss?"
- "What are my pending fee invoices?"
- "Show my assignment deadlines"
- "Which students are at risk?" (faculty/admin)
- "What's the revenue this month?" (admin)

Security: Every query is restricted to the user's own data (via user_id → student_id
or faculty_id FK chain). Admin/faculty get broader views.
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
        SELECT t.gpa, t.credits_earned, sem.title AS semester
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
               SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
               SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late,
               SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) AS leave
        FROM lms_attendance
        WHERE student_id = $1
    """, student_id)
    return dict(row) if row else {}


async def get_student_courses(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT c.code, c.title, c.credit_hours, sec.section_id,
               CONCAT(u.first_name, ' ', u.last_name) AS instructor,
               e.status AS enrollment_status, e.final_grade_points
        FROM sis_enrollments e
        JOIN lms_sections sec ON sec.section_id = e.section_id
        JOIN lms_courses c ON c.course_id = sec.course_id
        LEFT JOIN sis_faculty f ON f.faculty_id = sec.faculty_id
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
        JOIN lms_sections sec ON sec.section_id = a.section_id
        JOIN lms_courses c ON c.course_id = sec.course_id
        JOIN sis_enrollments e ON e.section_id = sec.section_id AND e.student_id = $1
        LEFT JOIN lms_submissions sub ON sub.assignment_id = a.assignment_id AND sub.student_id = $1
        WHERE a.due_date >= NOW()
        ORDER BY a.due_date
        LIMIT 10
    """, student_id)
    return [dict(r) for r in rows]


async def get_student_quiz_scores(pool, student_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT q.title AS quiz_title, c.code AS course_code,
               SUM(ans.score_obtained) AS score,
               SUM(qs.marks) AS total_marks
        FROM lms_answers ans
        JOIN lms_questions qs ON qs.question_id = ans.question_id
        JOIN lms_quizzes q ON q.quiz_id = ans.quiz_id
        JOIN lms_sections sec ON sec.section_id = q.section_id
        JOIN lms_courses c ON c.course_id = sec.course_id
        WHERE ans.student_id = $1
        GROUP BY q.quiz_id, q.title, c.code
        ORDER BY q.quiz_id DESC
        LIMIT 10
    """, student_id)
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Faculty queries
# ---------------------------------------------------------------------------

async def get_faculty_sections(pool, faculty_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT sec.section_id, c.code, c.title, c.credit_hours,
               sec.room_no, sec.capacity,
               (SELECT COUNT(*) FROM sis_enrollments e WHERE e.section_id = sec.section_id) AS enrolled
        FROM lms_sections sec
        JOIN lms_courses c ON c.course_id = sec.course_id
        WHERE sec.faculty_id = $1
        ORDER BY c.code
    """, faculty_id)
    return [dict(r) for r in rows]


async def get_section_at_risk_students(pool, section_id: int) -> list[dict]:
    rows = await pool.fetch("""
        SELECT s.roll_no, u.first_name, u.last_name, s.current_risk_status,
               COUNT(CASE WHEN a.status = 'Absent' THEN 1 END)::int AS absences
        FROM sis_enrollments e
        JOIN sis_students s ON s.student_id = e.student_id
        JOIN auth_users u ON u.user_id = s.user_id
        LEFT JOIN lms_attendance a ON a.student_id = s.student_id AND a.section_id = $1
        WHERE e.section_id = $1 AND s.current_risk_status IN ('Yellow', 'Red')
        GROUP BY s.student_id, s.roll_no, u.first_name, u.last_name, s.current_risk_status
        ORDER BY s.current_risk_status DESC
    """, section_id)
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
            
            quiz_scores = await get_student_quiz_scores(pool, student_id)
            low_scores = [f"{q['course_code']} - {q['quiz_title']} ({q['score']}/{q['total_marks']})" 
                          for q in quiz_scores if (q['score'] / q['total_marks'] < 0.5 if q['total_marks'] else False)]

            alerts = ""
            if low_scores:
                alerts = "\nLOW MARKS ALERTS (Offer help for these):\n" + "\n".join([f"- {s}" for s in low_scores])
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
        elif role == "faculty":
            faculty_id = await resolve_faculty_id(pool, user_id)
            if not faculty_id: return ""
            sections = await get_faculty_sections(pool, faculty_id)
            return f"USER CONTEXT: Faculty member teaching {len(sections)} sections."
            
        return ""

    async def get_student_program(self, user_id: str) -> str:
        """Resolve student user UUID -> Program Name."""
        pool = await self._pool()
        student_id = await resolve_student_id(pool, user_id)
        if not student_id: return ""
        profile = await get_student_profile(pool, student_id)
        return profile.get("program_name") or ""

    async def query(self, intent: str, user_id: str, role: str) -> Optional[str]:
        """Run a data query based on detected intent.  Returns formatted text or None."""
        pool = await self._pool()

        if role == "student":
            student_id = await resolve_student_id(pool, user_id)
            if not student_id:
                return "I couldn't find your student profile. Please contact the registrar."
            return await self._student_query(pool, intent, student_id)

        elif role == "faculty":
            faculty_id = await resolve_faculty_id(pool, user_id)
            if not faculty_id:
                return "I couldn't find your faculty profile."
            return await self._faculty_query(pool, intent, faculty_id)

        elif role in ("admin", "superadmin"):
            return await self._admin_query(pool, intent)

        return None

    async def _student_query(self, pool, intent: str, student_id: int) -> Optional[str]:
        intent_lower = intent.lower()

        if any(k in intent_lower for k in ["gpa", "grade", "cgpa", "transcript", "result"]):
            data = await get_student_gpa(pool, student_id)
            if not data:
                return "No transcript records found yet."
            lines = [f"- {r['semester']}: GPA {r['gpa']}, Credits {r['credits_earned']}" for r in data]
            return "**Your Transcript:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["attendance", "absent", "present", "missed"]):
            data = await get_student_attendance(pool, student_id)
            if not data or data.get("total") == 0:
                return "No attendance records found."
            pct = round(data["present"] / data["total"] * 100, 1) if data["total"] else 0
            return (
                f"**Your Attendance Summary:**\n"
                f"- Total classes: {data['total']}\n"
                f"- Present: {data['present']} | Absent: {data['absent']} | "
                f"Late: {data['late']} | Leave: {data['leave']}\n"
                f"- Attendance Rate: **{pct}%**"
            )

        if any(k in intent_lower for k in ["course", "enrolled", "class", "subject"]):
            data = await get_student_courses(pool, student_id)
            if not data:
                return "You are not enrolled in any courses."
            lines = [f"- {r['code']} — {r['title']} ({r['credit_hours']} cr) "
                     f"with {r['instructor'] or 'TBD'}" for r in data]
            return "**Your Enrolled Courses:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["fee", "payment", "invoice", "due", "challan"]):
            data = await get_student_pending_fees(pool, student_id)
            if not data:
                return "You have no pending fee invoices. All clear! ✅"
            lines = [f"- Invoice #{r['invoice_id']}: PKR {r['total_amount']} "
                     f"due {r['due_date']} ({r['status']})" for r in data]
            return "**Pending Fee Invoices:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["deadline", "assignment", "due", "homework", "submission"]):
            data = await get_student_upcoming_deadlines(pool, student_id)
            if not data:
                return "No upcoming assignment deadlines. 🎉"
            lines = [f"- [{r['status']}] {r['course_code']}: {r['title']} — "
                     f"Due {r['due_date']}" for r in data]
            return "**Upcoming Deadlines:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["quiz", "score", "test", "marks"]):
            data = await get_student_quiz_scores(pool, student_id)
            if not data:
                return "No quiz scores found."
            lines = [f"- {r['course_code']} — {r['quiz_title']}: "
                     f"{r['score']}/{r['total_marks']}" for r in data]
            return "**Your Quiz Scores:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["profile", "my info", "my detail"]):
            data = await get_student_profile(pool, student_id)
            if not data:
                return "Profile not found."
            return (
                f"**Your Profile:**\n"
                f"- Name: {data.get('first_name', '')} {data.get('last_name', '')}\n"
                f"- Roll No: {data.get('roll_no', 'N/A')}\n"
                f"- Email: {data.get('email', 'N/A')}\n"
                f"- Program: {data.get('program_name', 'N/A')}\n"
                f"- Department: {data.get('department_name', 'N/A')}\n"
                f"- Semester: {data.get('current_semester', 'N/A')}\n"
                f"- Risk Status: {data.get('current_risk_status', 'N/A')}"
            )

        return None  # Not a DB-answerable query

    async def _faculty_query(self, pool, intent: str, faculty_id: int) -> Optional[str]:
        intent_lower = intent.lower()

        if any(k in intent_lower for k in ["section", "course", "class", "teaching"]):
            data = await get_faculty_sections(pool, faculty_id)
            if not data:
                return "You are not assigned to any sections."
            lines = [f"- {r['code']} — {r['title']} | Room {r['room_no']} | "
                     f"{r['enrolled']}/{r['capacity']} students" for r in data]
            return "**Your Sections:**\n" + "\n".join(lines)

        if any(k in intent_lower for k in ["at risk", "at-risk", "weak", "struggling", "failing"]):
            sections = await get_faculty_sections(pool, faculty_id)
            if not sections:
                return "No sections assigned."
            all_risks = []
            for sec in sections:
                risks = await get_section_at_risk_students(pool, sec["section_id"])
                for r in risks:
                    all_risks.append(f"- {r['roll_no']} {r['first_name']} {r['last_name']} "
                                     f"— Status: {r['current_risk_status']} "
                                     f"({r['absences']} absences)")
            if not all_risks:
                return "No at-risk students in your sections."
            return "**At-Risk Students:**\n" + "\n".join(all_risks)

        return None

    async def _admin_query(self, pool, intent: str) -> Optional[str]:
        intent_lower = intent.lower()

        if any(k in intent_lower for k in [
            "dashboard", "stats", "overview", "summary", "total",
            "students", "revenue", "at risk",
        ]):
            data = await get_admin_stats(pool)
            return (
                f"**Admin Dashboard:**\n"
                f"- Total Students: {data['total_students']}\n"
                f"- Total Faculty: {data['total_faculty']}\n"
                f"- Total Courses: {data['total_courses']}\n"
                f"- Active Semester: {data['active_semester']}\n"
                f"- Monthly Revenue: PKR {data['monthly_revenue']:,.0f}\n"
                f"- At-Risk Students: {data['at_risk_students']}"
            )

        return None
