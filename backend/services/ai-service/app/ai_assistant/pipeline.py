"""
Pipeline — Main orchestrator for the hybrid CAG+RAG AI assistant.

Flow
----
1. Semantic cache lookup (CAG)             → instant if hit
2. FAQ keyword check                       → instant if match
3. Intent routing (keyword → LLM fallback)
4. DB query (if intent = db_query)
5. RAG retrieval (if intent = study_help / faq)
6. Study resource lookup (if study_help)
7. Persona prompt assembly
8. LLM generation (Groq → Gemini fallback)
9. Cache the answer (CAG update)
"""

from __future__ import annotations

import logging
from typing import Optional

from app.ai_assistant.llm_manager import llm_manager
from app.ai_assistant.cag_engine import SemanticCache
from app.ai_assistant.rag_engine import RAGEngine
from app.ai_assistant.router_engine import route_query, INTENT_DB_QUERY, INTENT_FAQ, INTENT_STUDY_HELP, INTENT_GENERAL, INTENT_SYSTEM_ACTION
from app.ai_assistant.db_query_engine import DBQueryEngine
from app.ai_assistant.persona import build_full_prompt
from app.ai_assistant.knowledge_base import get_faq_answer, get_study_resources, get_weak_subject_advice, find_study_topic

logger = logging.getLogger(__name__)


class AssistantPipeline:
    """Orchestrates the full CAG+RAG pipeline."""

    def __init__(
        self,
        redis_client,
        chroma_host: str = "chromadb",
        chroma_port: int = 8000,
        database_url: str = "",
    ):
        # CAG (semantic cache)
        self.cag = SemanticCache(
            redis_client=redis_client,
            embed_fn=llm_manager.embed_text,
            threshold=0.90,
            ttl=86400,
        )

        # RAG (retrieval)
        self.rag = RAGEngine(chroma_host=chroma_host, chroma_port=chroma_port)

        # DB query engine
        self.db_engine = DBQueryEngine(database_url) if database_url else None

    async def answer(
        self,
        query: str,
        user_id: str,
        role: str,
        session_id: Optional[str] = None,
        attachments: Optional[list[str]] = None,
    ) -> tuple[str, bool, dict]:
        """Process a user query through the full pipeline.

        Returns
        -------
        tuple[str, bool, dict]
            (answer, was_cached, metadata)
        """
        metadata: dict = {"intent": None, "sub_intent": None, "source": "llm"}

        # ----------------------------------------------------------------
        # Step 1: CAG cache lookup
        # ----------------------------------------------------------------
        try:
            cached = await self.cag.lookup(query)
            if cached:
                metadata["source"] = "cache"
                return cached, True, metadata
        except Exception as exc:
            logger.warning("CAG lookup failed: %s", exc)

        # ----------------------------------------------------------------
        # Step 2: Built-in FAQ check
        # ----------------------------------------------------------------
        faq_answer = get_faq_answer(query)
        if faq_answer:
            metadata["intent"] = "faq"
            metadata["source"] = "faq_builtin"
            # Cache FAQ answers
            await self._safe_cache_update(query, faq_answer)
            return faq_answer, False, metadata

        # ----------------------------------------------------------------
        # Step 3: Intent routing
        # ----------------------------------------------------------------
        intent, sub_intent = await route_query(query, llm_manager)
        metadata["intent"] = intent
        metadata["sub_intent"] = sub_intent
        logger.info("Intent: %s | Sub: %s", intent, sub_intent)

        # ----------------------------------------------------------------
        # Step 4: DB query (if intent is db_query)
        # ----------------------------------------------------------------
        db_data = ""
        if intent == INTENT_DB_QUERY and self.db_engine:
            try:
                db_result = await self.db_engine.query(query, user_id, role)
                if db_result:
                    db_data = db_result
                    metadata["source"] = "database"
            except Exception as exc:
                logger.error("DB query failed: %s", exc)
                db_data = "(Database query failed — showing general knowledge)"

        # ----------------------------------------------------------------
        # Step 5: RAG retrieval (for study_help and faq intents)
        # ----------------------------------------------------------------
        context = ""
        if intent in (INTENT_STUDY_HELP, INTENT_FAQ):
            try:
                query_vector = await llm_manager.embed_text(query)
                docs = await self.rag.retrieve(query, query_vector, role, user_id, top_k=5)
                context = self.rag.format_context(docs)
                if docs:
                    metadata["source"] = "rag"
            except Exception as exc:
                logger.warning("RAG retrieval failed: %s", exc)

        # ----------------------------------------------------------------
        # Step 6: Study resources (if study_help)
        # ----------------------------------------------------------------
        study_resources = ""
        if intent == INTENT_STUDY_HELP:
            study_resources = get_study_resources(query)

            # Check if user is asking about weakness / improvement
            q_lower = query.lower()
            if any(w in q_lower for w in ["weak", "struggling", "can't understand",
                                           "hard for me", "difficult", "help me with",
                                           "improve", "failing"]):
                topic = find_study_topic(query)
                if topic:
                    advice = get_weak_subject_advice(topic)
                    study_resources = advice + "\n\n" + study_resources

        # ----------------------------------------------------------------
        # Step 7: Handle general chat / system actions simply
        # ----------------------------------------------------------------
        if intent == INTENT_GENERAL:
            answer = await self._handle_general(query, role)
            return answer, False, metadata

        if intent == INTENT_SYSTEM_ACTION:
            answer = (
                "I can provide information and answer questions, but I can't perform "
                "system actions directly (like enrolling or paying fees). Please use "
                "the appropriate section in the Nexus portal:\n"
                "- **Enrollment** → SIS Portal\n"
                "- **Fee Payment** → Finance Section\n"
                "- **Course Materials** → LMS\n"
                "- **Profile Update** → Settings\n\n"
                "Want me to help you with something else?"
            )
            return answer, False, metadata

        # ----------------------------------------------------------------
        # Step 8: Build prompt and generate with LLM
        # ----------------------------------------------------------------
        user_summary = ""
        program_name = ""
        if self.db_engine:
            try:
                user_summary = await self.db_engine.get_user_context_summary(user_id, role)
                if role == "student":
                    program_name = await self.db_engine.get_student_program(user_id)
            except Exception as exc:
                logger.warning("Failed to fetch user summary: %s", exc)

        system_prompt = build_full_prompt(
            role=role,
            context=context,
            db_data=db_data,
            study_sub_intent=sub_intent,
            study_resources=study_resources,
            user_summary=user_summary,
            program_name=program_name,
            attachments=attachments,
        )

        try:
            answer = await llm_manager.generate(
                system_prompt=system_prompt,
                user_message=query,
                temperature=0.3,
                max_tokens=2048,
            )
        except Exception as exc:
            logger.error("LLM generation failed: %s", exc)
            # If DB data was available, return it raw
            if db_data:
                answer = db_data
            else:
                answer = (
                    "I'm sorry, I'm having trouble generating a response right now. "
                    "Please try again in a moment."
                )

        if db_data and answer.startswith("I'm sorry, all AI providers are currently unavailable"):
            answer = db_data

        # ----------------------------------------------------------------
        # Step 9: Cache the answer
        # ----------------------------------------------------------------
        await self._safe_cache_update(query, answer)

        return answer, False, metadata

    async def _handle_general(self, query: str, role: str) -> str:
        """Handle casual chat / greetings."""
        role_name = {"student": "student", "faculty": "professor", "admin": "admin"}.get(role, "user")
        try:
            return await llm_manager.generate(
                system_prompt=(
                    f"You are Nexus AI, a friendly university assistant. "
                    f"You're chatting with a {role_name}. Be warm and helpful. "
                    f"Keep it brief (1-3 sentences). If they say hi, greet them "
                    f"and mention you can help with academics, grades, attendance, "
                    f"study help, and university info."
                ),
                user_message=query,
                temperature=0.7,
                max_tokens=200,
            )
        except Exception:
            return (
                "👋 Hello! I'm Nexus AI, your university assistant. "
                "I can help you with grades, attendance, study help, and more. "
                "What would you like to know?"
            )

    async def _safe_cache_update(self, query: str, answer: str):
        """Cache an answer, silently ignoring errors."""
        try:
            await self.cag.update(query, answer)
        except Exception as exc:
            logger.debug("Cache update failed: %s", exc)
