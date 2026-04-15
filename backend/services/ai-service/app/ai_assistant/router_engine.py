"""
Router Engine — Intent classification and query routing.

Adapted from StudyBuddy's LLM router pattern with keyword guards.

Routes
------
1. ``db_query``       — User asks about their data (grades, attendance, fees…)
2. ``study_help``     — User needs academic help (concepts, coding, debugging)
3. ``faq``            — University FAQ / policy question
4. ``general_chat``   — Casual greeting or off-topic
5. ``system_action``  — User wants to do something (enroll, pay, etc.)

Sub-intents for study_help (from StudyBuddy):
  coding_example, debugging, summarization, simplified_explanation,
  theoretical_explanation, comparison, pros_cons, step_by_step,
  quiz_practice, historical_context
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Intent categories
# ---------------------------------------------------------------------------

INTENT_DB_QUERY = "db_query"
INTENT_STUDY_HELP = "study_help"
INTENT_FAQ = "faq"
INTENT_GENERAL = "general_chat"
INTENT_SYSTEM_ACTION = "system_action"

# Study sub-intents
STUDY_CODING = "coding_example"
STUDY_DEBUGGING = "debugging"
STUDY_SUMMARY = "summarization"
STUDY_ELI5 = "simplified_explanation"
STUDY_THEORY = "theoretical_explanation"
STUDY_COMPARE = "comparison"
STUDY_PROS_CONS = "pros_cons"
STUDY_STEP_BY_STEP = "step_by_step"
STUDY_QUIZ = "quiz_practice"
STUDY_HISTORY = "historical_context"

# ---------------------------------------------------------------------------
# Keyword guards (instant — no LLM call needed)
# ---------------------------------------------------------------------------

DB_KEYWORDS = [
    "my gpa", "my grade", "my attendance", "my course", "my fee",
    "my invoice", "my quiz", "my score", "my assignment", "my deadline",
    "my profile", "my transcript", "my result", "my cgpa",
    "how many classes", "how many absent", "pending fee", "fee due",
    "enrolled course", "upcoming deadline", "at risk", "at-risk",
    "dashboard", "total students", "total faculty", "revenue",
    "my schedule", "my timetable",
]

FAQ_KEYWORDS = [
    "policy", "admission", "fee structure", "exam date", "holiday",
    "semester date", "rules", "regulation", "scholarship", "hostel",
    "library hours", "office hours", "contact", "helpdesk", "refund",
    "dropping", "withdrawal", "prerequisite", "grading policy",
    "academic calendar", "convocation",
]

STUDY_KEYWORDS = {
    STUDY_CODING: ["code", "syntax", "implement", "program", "python", "java",
                   "c++", "javascript", "function", "class", "algorithm"],
    STUDY_DEBUGGING: ["error", "bug", "fix", "debug", "crash", "exception",
                      "traceback", "not working", "broken"],
    STUDY_SUMMARY: ["summarize", "summary", "tldr", "tl;dr", "overview",
                    "brief", "bullet points", "key points"],
    STUDY_ELI5: ["simple", "eli5", "easy", "basic", "beginner", "layman"],
    STUDY_THEORY: ["explain", "what is", "define", "concept", "theory",
                   "tell me about", "describe", "meaning"],
    STUDY_COMPARE: ["vs", "versus", "compare", "difference", "differ",
                    "similarities"],
    STUDY_PROS_CONS: ["pros", "cons", "advantage", "disadvantage",
                      "benefit", "drawback", "tradeoff"],
    STUDY_STEP_BY_STEP: ["step by step", "how to", "solve", "calculate",
                         "process", "procedure", "steps"],
    STUDY_QUIZ: ["quiz", "test me", "practice", "question", "exam prep",
                 "mock test", "exercise"],
    STUDY_HISTORY: ["history", "invented", "origin", "who created",
                    "when was", "evolution"],
}

GENERAL_KEYWORDS = ["hello", "hi", "hey", "thanks", "thank you", "bye",
                    "good morning", "good night", "how are you", "who are you"]

SYSTEM_KEYWORDS = ["enroll", "register", "pay", "upload", "submit",
                   "change password", "update profile", "drop course"]


# ---------------------------------------------------------------------------
# Keyword-based fast router
# ---------------------------------------------------------------------------

def _keyword_route(query: str) -> Optional[tuple[str, Optional[str]]]:
    """Attempt to route via keyword matching (0ms latency)."""
    q = query.lower()

    # General chat (greetings)
    for kw in GENERAL_KEYWORDS:
        if kw in q and len(query.split()) < 8:
            return (INTENT_GENERAL, None)

    # DB queries
    for kw in DB_KEYWORDS:
        if kw in q:
            return (INTENT_DB_QUERY, None)

    # System actions
    for kw in SYSTEM_KEYWORDS:
        if kw in q:
            return (INTENT_SYSTEM_ACTION, None)

    # FAQ / policy
    for kw in FAQ_KEYWORDS:
        if kw in q:
            return (INTENT_FAQ, None)

    # Study help sub-intents
    for sub_intent, keywords in STUDY_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                return (INTENT_STUDY_HELP, sub_intent)

    return None


# ---------------------------------------------------------------------------
# LLM-based router (fallback)
# ---------------------------------------------------------------------------

LLM_ROUTER_PROMPT = """You are a Classification Bot for a university AI assistant.
Analyze the user's question and map it to EXACTLY ONE category.

Categories:
[db_query] — User asks about their own data: grades, GPA, attendance, courses, fees, invoices, profile, scores, deadlines, class schedule
[study_help] — User needs academic help: explaining concepts, coding, debugging, math, science, any study topic
[faq] — University policy question, admission info, dates, rules, hostel, library
[general_chat] — Greeting, thanks, casual chitchat
[system_action] — User wants to perform an action: enroll, pay, upload, register

USER QUESTION: "{question}"

RETURN ONLY THE CATEGORY NAME INSIDE BRACKETS. DO NOT EXPLAIN.
Example: [study_help]"""


async def _llm_route(query: str, llm_manager) -> tuple[str, Optional[str]]:
    """Use LLM for intent classification when keyword guards fail."""
    try:
        prompt = LLM_ROUTER_PROMPT.format(question=query)
        response = await llm_manager.classify(prompt)
        clean = response.strip().lower().replace("[", "").replace("]", "")

        valid = {INTENT_DB_QUERY, INTENT_STUDY_HELP, INTENT_FAQ,
                 INTENT_GENERAL, INTENT_SYSTEM_ACTION}
        if clean in valid:
            logger.info("LLM Router → %s", clean)
            return (clean, None)
    except Exception as exc:
        logger.warning("LLM routing failed: %s", exc)

    # Default fallback
    return (INTENT_STUDY_HELP, STUDY_THEORY)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def route_query(query: str, llm_manager=None) -> tuple[str, Optional[str]]:
    """Classify a query into (intent, sub_intent).

    Returns
    -------
    tuple[str, str | None]
        (intent, sub_intent) — sub_intent is only set for study_help.
    """
    # Phase 1: Keyword guards (instant)
    result = _keyword_route(query)
    if result:
        logger.info("Keyword Router → %s", result)
        return result

    # Phase 2: LLM classification (if available)
    if llm_manager:
        return await _llm_route(query, llm_manager)

    # Safe default
    return (INTENT_STUDY_HELP, STUDY_THEORY)
