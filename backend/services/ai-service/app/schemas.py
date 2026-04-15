from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    """Incoming chat request from the user."""

    query: str = Field(..., min_length=1, max_length=4000, description="User's question")
    session_id: Optional[str] = Field(None, description="Existing session ID to continue a conversation")


class ChatMessageOut(BaseModel):
    """Single message returned in a chat history response."""

    role: str
    content: str
    timestamp: str


class ChatResponse(BaseModel):
    """Response returned by the /chat endpoint."""

    response: str
    session_id: str
    cached: bool = False
    intent: Optional[str] = None
    sub_intent: Optional[str] = None
    source: Optional[str] = None  # "cache", "database", "rag", "faq_builtin", "llm"


class ChatHistoryOut(BaseModel):
    """Full chat history for the current user."""

    messages: list[ChatMessageOut] = []  # Safe with Pydantic v2; consider default_factory for clarity


# ---------------------------------------------------------------------------
# Embeddings / Document Ingestion
# ---------------------------------------------------------------------------

class EmbedDocumentRequest(BaseModel):
    """Request to embed a new document into ChromaDB."""

    document: str = Field(..., min_length=1, description="Raw text content to embed")
    collection: str = Field(..., min_length=1, description="Target ChromaDB collection name")
    metadata: Optional[dict] = Field(None, description="Optional metadata to attach to the document")


# ---------------------------------------------------------------------------
# Study Resources
# ---------------------------------------------------------------------------

class StudyHelpRequest(BaseModel):
    """Request for study resources / improvement advice."""

    topic: str = Field(..., min_length=1, max_length=200, description="Subject or topic to get help with")


class StudyHelpResponse(BaseModel):
    """Study resources and advice for a topic."""

    topic: str
    resources: str
    advice: str


# ---------------------------------------------------------------------------
# System Status
# ---------------------------------------------------------------------------

class AIStatusResponse(BaseModel):
    """AI service health and status info."""

    status: str
    gemini_keys: int
    groq_keys: int
    cache_entries: int
    cache_threshold: float


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
