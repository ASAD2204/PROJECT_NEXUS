"""
Router Engine — Classifies user intent to choose the right handling path.
Enhanced for Hyper-Speed Multi-Role Intelligence.
"""

from __future__ import annotations
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Constants
INTENT_DB_QUERY = "db_query"
INTENT_STUDY_HELP = "study_help"
INTENT_FAQ = "faq"
INTENT_GENERAL = "general"
INTENT_SYSTEM_ACTION = "system_action"
INTENT_ACADEMIC_TOOL = "academic_tool"

# Tool Sub-intents
TOOL_QUIZ = "quiz_generation"
TOOL_ASSIGNMENT = "assignment_blueprint"
TOOL_STUDY_PLAN = "study_plan"
TOOL_SUMMARY = "research_summary"
TOOL_ALUMNI = "alumni_networking"
TOOL_FINANCE = "financial_summary"

async def route_query(query: str, llm) -> tuple[str, Optional[str]]:
    """
    Hyper-speed routing using keyword prioritization before LLM fallback.
    """
    q_lower = query.lower()

    # 1. DATABASE QUERIES (Priority for factual records)
    # If the user asks for THEIR data (scores, marks, fees), go to DB first.
    if any(w in q_lower for w in [
        "gpa", "marks", "attendance", "fee", "cgpa", "invoice", "result",
        "timetable", "schedule", "class", "teacher", "instructor", "professor",
        "grading", "roster", "student list", "enrolled", "overdue", "reservation",
        "revenue", "collection", "money", "mentor", "networking",
        "program", "department", "staff", "faculty", "employee", "roster",
        "dashboard", "overview", "stats", "summary",
        "grade", "grades", "midterm", "finalterm", "sessional", "profile", "guardian",
        "email", "phone", "blood group", "my info", "roll number", "roll no", "registration",
        "dues", "due", "unpaid", "payment", "at risk", "risk", "graduated", "alumni", "alumnus",
        "book", "books", "library", "catalog", "shelf", "circulation", "job", "jobs", "career", "employer", "opening", "mentorship"
    ]):
        return INTENT_DB_QUERY, None
    if "my quiz" in q_lower or "my assignment" in q_lower:
        return INTENT_DB_QUERY, None

    # 2. ACADEMIC TOOLS (Generative / Logic keywords)
    if any(w in q_lower for w in ["quiz", "test", "practice questions"]):
        return INTENT_ACADEMIC_TOOL, TOOL_QUIZ
    if any(w in q_lower for w in ["assignment", "homework", "blueprint"]):
        return INTENT_ACADEMIC_TOOL, TOOL_ASSIGNMENT
    if any(w in q_lower for w in ["study plan", "schedule"]):
        return INTENT_ACADEMIC_TOOL, TOOL_STUDY_PLAN
    if any(w in q_lower for w in ["summarize", "research", "deep summary"]):
        return INTENT_ACADEMIC_TOOL, TOOL_SUMMARY

    # 3. ROLE-SPECIFIC HIGH-SPEED KEYWORDS
    # Admin / Alumni / Librarian specific
    if any(w in q_lower for w in ["revenue", "financial health", "growth"]):
        return INTENT_ACADEMIC_TOOL, TOOL_FINANCE
    if any(w in q_lower for w in ["networking", "career", "alumni path"]):
        return INTENT_ACADEMIC_TOOL, TOOL_ALUMNI

    # 4. LLM Classifier (Fast Fallback)
    try:
        # Using temperature 0 for max speed/determinism
        resp = await llm.classify(f"Classify query for university AI: '{query}'. Options: db_query, academic_tool, faq, general.")
        resp = resp.lower()
        
        if "academic_tool" in resp:
            return INTENT_ACADEMIC_TOOL, TOOL_SUMMARY
        if "db_query" in resp: return INTENT_DB_QUERY, None
        if "study_help" in resp: return INTENT_STUDY_HELP, None
        if "faq" in resp: return INTENT_FAQ, None
    except Exception:
        pass

    return INTENT_GENERAL, None
