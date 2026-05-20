"""
Pipeline — Main orchestrator for the hybrid CAG+RAG AI assistant.
"""

from __future__ import annotations
import logging
from typing import Optional
from app.ai_assistant.llm_manager import llm_manager
from app.ai_assistant.cag_engine import SemanticCache
from app.ai_assistant.rag_engine import RAGEngine
from app.ai_assistant.router_engine import (
    route_query, INTENT_DB_QUERY, INTENT_FAQ, INTENT_STUDY_HELP, 
    INTENT_GENERAL, INTENT_SYSTEM_ACTION, INTENT_ACADEMIC_TOOL
)
from app.ai_assistant.db_query_engine import DBQueryEngine
from app.ai_assistant.persona import build_full_prompt
from app.ai_assistant.knowledge_base import get_faq_answer, get_study_resources, get_weak_subject_advice, find_study_topic
from app.ai_assistant.document_parser import parse_document
from app.database import chat_messages
import httpx

logger = logging.getLogger(__name__)

class AssistantPipeline:
    def __init__(self, redis_client, chroma_host: str = "chromadb", chroma_port: int = 8000, database_url: str = ""):
        self.cag = SemanticCache(redis_client=redis_client, embed_fn=llm_manager.embed_text)
        self.rag = RAGEngine(chroma_host=chroma_host, chroma_port=chroma_port)
        self.db_engine = DBQueryEngine(database_url) if database_url else None

    def is_greeting_query(self, query: str) -> bool:
        import re
        # Clean query: strip punctuation, convert to lowercase, normalize whitespace
        cleaned = re.sub(r'[^\w\s]', '', query).lower().strip()
        
        # Common greeting words (exact match or at the start of very short messages)
        greetings = {
            "hey", "hy", "hello", "hi", "salam", "assalamualaikum", "aoa", "helo",
            "yo", "hola", "greetings", "good morning", "good afternoon", "good evening",
            "wassup", "sup"
        }
        
        if cleaned in greetings:
            return True
            
        words = cleaned.split()
        if not words:
            return False
            
        # Also capture "hey there", "hello assistant", "hi there", "hy buddy", "hi sweetie", etc.
        if len(words) <= 2 and words[0] in greetings:
            return True
            
        # Check if they are just asking "how are you" or similar standard followups to greetings
        how_are_you_phrases = {
            "how are you", "how are you doing", "hows it going", "how is it going",
            "how do you do", "doing well"
        }
        if cleaned in how_are_you_phrases:
            return True
            
        # Also check if it starts with a greeting and has up to 4 words (e.g. "hi how are you?")
        if len(words) <= 4 and words[0] in greetings:
            return True
            
        return False

    async def answer(self, query: str, user_id: str, role: str, session_id: Optional[str] = None, attachments: Optional[list[dict]] = None) -> tuple[str, bool, dict]:
        metadata: dict = {"intent": None, "source": "llm"}

        # 0. SHORT-CIRCUIT GREETING PIPELINE
        if self.is_greeting_query(query):
            first_name = None
            if self.db_engine:
                try:
                    pool = await self.db_engine._pool()
                    row = await pool.fetchrow(
                        "SELECT first_name FROM auth_users WHERE user_id = $1", user_id
                    )
                    if row:
                        first_name = row["first_name"]
                except Exception as e:
                    logger.error(f"Error fetching user name for greeting: {e}")
            
            # Map user's role to specialist title & focus areas
            role_lower = role.lower()
            if role_lower == "student":
                specialist_title = "Strategic Success Partner"
                focus = "your grades, GPA optimization, predictive risk alerts, course pathing, timetable, or leave applications"
            elif role_lower in ("faculty", "teacher"):
                specialist_title = "Instructional Chief-of-Staff"
                focus = "section performance analytics, grading velocity, teaching schedule, at-risk student monitoring, or leave requests"
            elif role_lower in ("admin", "superadmin", "hod"):
                specialist_title = "sovereign institutional brain"
                focus = "campus financial velocity, departmental health, staff management, leave approvals, and resource optimization"
            elif role_lower == "librarian":
                specialist_title = "Knowledge Strategist"
                focus = "circulation velocity, book catalog search, overdue risk management, and library inventory stats"
            elif role_lower == "alumni":
                specialist_title = "Career Pathfinder"
                focus = "job matching, career opportunities, networking, and registry profile updates"
            else:
                specialist_title = "Nexus Intelligence Core"
                focus = "general campus queries, information, and tasks"

            name_part = f" {first_name}" if first_name else ""
            system_prompt = (
                f"You are the **{specialist_title}** for Project Nexus, a premium university portal.\n"
                f"The user role is **{role.upper()}**.\n"
                f"The user's first name is **{first_name or 'there'}**.\n\n"
                f"**Your Mandate for Greetings:**\n"
                f"- Greet the user warmly, premiumly, and professionally by name (e.g. 'Hello{name_part}!', 'Greetings{name_part}!', 'Hey{name_part}!').\n"
                f"- Identify yourself as their **{specialist_title}**.\n"
                f"- Briefly state how you can help them (focusing on: {focus}).\n"
                f"- Ask them what they want to ask or how you can assist them today.\n"
                f"- Keep the response concise, engaging, and premium in aesthetic (use clean Markdown styling, bold role titles, and appropriate professional warmth).\n"
                f"- **DO NOT** mention or assume any specific transactional balances, grades, fees, or data points since they haven't asked for them yet. Keep it purely as a warm welcome/introduction."
            )

            answer = await llm_manager.generate(
                system_prompt=system_prompt,
                user_message=query,
                attachments=None,
                temperature=0.4
            )
            metadata["intent"] = INTENT_GENERAL
            metadata["greeting"] = True
            metadata["source"] = "llm"
            return answer, False, metadata

        # 1. INTENT ROUTING (Run first to determine if we need real-time data)
        intent, sub_intent = await route_query(query, llm_manager)
        metadata["intent"] = intent
        
        # 2. CAG SPEED LOOKUP (Only for non-database queries to prevent stale data)
        if intent != INTENT_DB_QUERY:
            cached = await self.cag.lookup(query, user_id)
            if cached:
                metadata["source"] = "cache"
                return cached, True, metadata

        # 3. CONTEXT GATHERING
        user_summary = ""
        if self.db_engine:
            cache_key = f"ai:user_context:{user_id}"
            cached_context = await self.cag.redis.get(cache_key) if self.cag.redis else None
            
            if cached_context:
                user_summary = cached_context.decode('utf-8') if isinstance(cached_context, bytes) else cached_context
            else:
                user_summary = await self.db_engine.get_user_context_summary(user_id, role)
                if user_summary and self.cag.redis:
                    await self.cag.redis.set(cache_key, user_summary, ex=600)

        db_data = ""
        if self.db_engine:
            # We always try to query DB if it's a potential DB intent
            db_data = await self.db_engine.query(query, user_id, role)
            if db_data: metadata["source"] = "database"

        context = ""
        if intent in (INTENT_STUDY_HELP, INTENT_FAQ, INTENT_ACADEMIC_TOOL):
            query_vector = await llm_manager.embed_text(query)
            docs = await self.rag.retrieve(query, query_vector, role, user_id, top_k=5)
            context = self.rag.format_context(docs)
            if context and not db_data: metadata["source"] = "rag"

        # 4. DOCUMENT INTELLIGENCE (PDF/DOCX Processing)
        document_text = ""
        if attachments:
            async with httpx.AsyncClient() as client:
                for att in attachments:
                    file_url = att.get("file_url")
                    file_name = att.get("file_name", "unknown")
                    if not file_url: continue
                    
                    if any(file_name.lower().endswith(ext) for ext in ['.pdf', '.docx']):
                        try:
                            # Convert external URL to internal if needed (e.g. localhost -> chat-service)
                            internal_url = file_url.replace("localhost:3001/api/v1/chat", "chat-service:8000")
                            resp = await client.get(internal_url)
                            if resp.status_code == 200:
                                parsed = await parse_document(resp.content, file_name)
                                if parsed:
                                    document_text += f"\n--- CONTENT FROM {file_name} ---\n{parsed}\n"
                        except Exception as e:
                            logger.error(f"Doc fetch error: {e}")

        # 5. HISTORY RETRIEVAL
        history_text = ""
        if session_id:
            cursor = chat_messages.find({"session_id": session_id}).sort("timestamp", -1).limit(3)
            history_docs = await cursor.to_list(length=3)
            history_docs.reverse()
            history_text = "\n".join([f"{('User' if h.get('role') == 'user' else 'Assistant')}: {h.get('content')}" for h in history_docs])

        # 6. GENERATION
        system_prompt = build_full_prompt(
            role=role, context=context + (f"\nATTACHED DOCUMENT CONTEXT:\n{document_text}" if document_text else ""),
            db_data=db_data, user_summary=user_summary,
            history=history_text, academic_tool=sub_intent if intent == INTENT_ACADEMIC_TOOL else None
        )

        answer = await llm_manager.generate(
            system_prompt=system_prompt, user_message=query, 
            attachments=[a.get("file_url") for a in attachments] if attachments else None,
            temperature=0.2 
        )

        # 7. ASYNC CACHE UPDATE (Only for non-database queries)
        if intent != INTENT_DB_QUERY:
            import asyncio
            asyncio.create_task(self.cag.update(query, answer, user_id))

        return answer, False, metadata
