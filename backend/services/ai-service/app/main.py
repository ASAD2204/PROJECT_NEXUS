"""
Project Nexus — AI Service (FastAPI application entry point).

Hybrid CAG+RAG AI Assistant with:
- Multi-key rotation (Gemini + Groq)
- ChromaDB + BM25 ensemble retriever
- Redis semantic cache (cosine similarity)
- FlashRank reranking
- Real-time database access
- Role-based personas (student, faculty, admin)
"""

import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.config import settings
from app.ai_assistant.llm_manager import llm_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — initialise LLM manager at startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup: initialise the multi-key LLM manager."""
    gemini_keys = settings.all_gemini_keys
    groq_keys = settings.GROQ_API_KEYS

    llm_manager.init(
        gemini_keys_csv=gemini_keys,
        groq_keys_csv=groq_keys,
    )
    status = llm_manager.status()
    logger.info(
        "AI Service ready — Gemini keys: %d, Groq keys: %d",
        status["gemini_keys"], status["groq_keys"],
    )
    yield
    logger.info("AI Service shutting down")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Project Nexus AI Service",
    description=(
        "Hybrid CAG+RAG chatbot powered by Groq (Llama-3.1) + Google Gemini "
        "with multi-key rotation, ChromaDB+BM25 retrieval, FlashRank reranking, "
        "Redis semantic cache, and real-time database access."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    status_info = llm_manager.status()
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "2.0.0",
        "llm_providers": {
            "gemini_keys": status_info["gemini_keys"],
            "groq_keys": status_info["groq_keys"],
        },
    }
