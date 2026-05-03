"""
AI-service API routes.

Prefix: /ai

Endpoints:
  POST   /ai/chat             — Main conversational endpoint (CAG+RAG)
  GET    /ai/chat/history      — Retrieve chat history
  DELETE /ai/chat/history      — Clear chat history
  POST   /ai/study-help        — Get study resources for a topic
  POST   /ai/embed-document    — Ingest document into ChromaDB (admin)
  GET    /ai/status             — AI service health / key status
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import chat_messages, redis_client
from app.dependencies import get_current_user
from app.schemas import (
    ChatHistoryOut,
    ChatMessageOut,
    ChatRequest,
    ChatResponse,
    EmbedDocumentRequest,
    MessageResponse,
    StudyHelpRequest,
    StudyHelpResponse,
    AIStatusResponse,
)
from app.config import settings
from app.ai_assistant.pipeline import AssistantPipeline
from app.ai_assistant.llm_manager import llm_manager
from app.ai_assistant.knowledge_base import get_study_resources, get_weak_subject_advice, find_study_topic

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Chat"])

# Pipeline singleton (initialised on first request)
_pipeline: AssistantPipeline | None = None


def _get_pipeline() -> AssistantPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = AssistantPipeline(
            redis_client=redis_client,
            chroma_host=settings.CHROMA_HOST,
            chroma_port=settings.CHROMA_PORT,
            database_url=settings.DATABASE_URL,
        )
    return _pipeline


# ---------------------------------------------------------------------------
# POST /ai/chat
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    """Main conversational endpoint — hybrid CAG+RAG pipeline."""

    session_id = body.session_id or str(uuid.uuid4())
    user_id = user["user_id"]
    role = user.get("role", "student")

    pipeline = _get_pipeline()

    # Run full pipeline
    answer, was_cached, meta = await pipeline.answer(
        query=body.query,
        user_id=user_id,
        role=role,
        session_id=session_id,
        attachments=body.attachments,
    )

    now = datetime.now(timezone.utc).isoformat()

    # Persist messages to MongoDB
    try:
        await chat_messages.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": "user",
            "content": body.query,
            "attachments": body.attachments,
            "timestamp": now,
        })
        await chat_messages.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": "assistant",
            "content": answer,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "intent": meta.get("intent"),
            "source": meta.get("source"),
        })
    except Exception as exc:
        logger.error("Failed to persist chat messages: %s", exc)

    return ChatResponse(
        response=answer,
        session_id=session_id,
        cached=was_cached,
        intent=meta.get("intent"),
        sub_intent=meta.get("sub_intent"),
        source=meta.get("source"),
    )


# ---------------------------------------------------------------------------
# GET /ai/chat/history
# ---------------------------------------------------------------------------

@router.get("/chat/history", response_model=ChatHistoryOut)
async def get_chat_history(
    session_id: str | None = None,
    user: dict = Depends(get_current_user),
):
    """Return chat history for the current user, optionally filtered by session."""

    query_filter: dict = {"user_id": user["user_id"]}
    if session_id:
        query_filter["session_id"] = session_id

    try:
        cursor = chat_messages.find(query_filter).sort("timestamp", 1)
        docs = await cursor.to_list(length=500)
    except Exception as exc:
        logger.error("Failed to fetch chat history: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve chat history.",
        )

    messages = [
        ChatMessageOut(
            role=doc["role"],
            content=doc["content"],
            timestamp=doc.get("timestamp", ""),
            attachments=doc.get("attachments"),
        )
        for doc in docs
    ]

    return ChatHistoryOut(messages=messages)


# ---------------------------------------------------------------------------
# DELETE /ai/chat/history
# ---------------------------------------------------------------------------

@router.delete("/chat/history", response_model=MessageResponse)
async def delete_chat_history(
    session_id: str | None = None,
    user: dict = Depends(get_current_user),
):
    """Clear chat history for the current user, optionally scoped to one session."""

    user_id = user["user_id"]
    query_filter: dict = {"user_id": user_id}
    if session_id:
        query_filter["session_id"] = session_id

    try:
        result = await chat_messages.delete_many(query_filter)
        deleted_count = result.deleted_count
    except Exception as exc:
        logger.error("Failed to delete chat history: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete chat history.",
        )

    # Flush Redis session caches belonging to this user
    try:
        async for key in redis_client.scan_iter(match=f"session:{user_id}:*"):
            await redis_client.delete(key)
    except Exception as exc:
        logger.warning("Redis flush failed: %s", exc)

    return MessageResponse(message=f"Deleted {deleted_count} messages.")


# ---------------------------------------------------------------------------
# POST /ai/study-help
# ---------------------------------------------------------------------------

@router.post("/study-help", response_model=StudyHelpResponse)
async def study_help(body: StudyHelpRequest, user: dict = Depends(get_current_user)):
    """Get study resources and improvement advice for a topic."""

    topic = find_study_topic(body.topic) or body.topic
    resources = get_study_resources(body.topic)
    advice = get_weak_subject_advice(body.topic)

    return StudyHelpResponse(
        topic=topic,
        resources=resources or "No specific resources found for this topic.",
        advice=advice,
    )


# ---------------------------------------------------------------------------
# POST /ai/embed-document (admin only)
# ---------------------------------------------------------------------------

@router.post("/embed-document", response_model=MessageResponse)
async def embed_document(
    body: EmbedDocumentRequest,
    user: dict = Depends(get_current_user),
):
    """Ingest a document into ChromaDB (admin-only)."""

    if user["role"] not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can embed documents.",
        )

    # 1. Connect to ChromaDB
    try:
        import chromadb
        chroma_client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
        )
    except Exception as exc:
        logger.error("ChromaDB connection failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ChromaDB is not reachable: {exc}",
        )

    # 2. Get or create the target collection
    try:
        collection = chroma_client.get_or_create_collection(body.collection)
    except Exception as exc:
        logger.error("ChromaDB collection error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not access collection '{body.collection}': {exc}",
        )

    # 3. Generate embedding via LLM manager (multi-key)
    doc_id = str(uuid.uuid4())
    metadata = body.metadata or {}

    embedding = await llm_manager.embed_text(body.document)

    # 4. Add document to collection
    try:
        add_kwargs: dict = {
            "ids": [doc_id],
            "documents": [body.document],
            "metadatas": [metadata],
        }
        if embedding:
            add_kwargs["embeddings"] = [embedding]

        collection.add(**add_kwargs)
    except Exception as exc:
        logger.error("ChromaDB insert failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store document: {exc}",
        )

    return MessageResponse(
        message=f"Document embedded successfully in collection '{body.collection}' with id '{doc_id}'."
    )


# ---------------------------------------------------------------------------
# GET /ai/status
# ---------------------------------------------------------------------------

@router.get("/status", response_model=AIStatusResponse)
async def ai_status(user: dict = Depends(get_current_user)):
    """Return AI service health and configuration info."""

    pipeline = _get_pipeline()
    llm_status = llm_manager.status()
    cache_stats = await pipeline.cag.stats()

    return AIStatusResponse(
        status="operational",
        gemini_keys=llm_status["gemini_keys"],
        groq_keys=llm_status["groq_keys"],
        cache_entries=cache_stats["cached_entries"],
        cache_threshold=cache_stats["threshold"],
    )
