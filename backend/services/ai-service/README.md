# AI Service

> **RAG + CAG AI Assistant microservice for Project Nexus**

## Overview

The AI Service provides an intelligent conversational assistant (Nexus AI) with a full RAG (Retrieval-Augmented Generation) + CAG (Cache-Augmented Generation) pipeline. It supports multi-provider LLM key rotation (Groq + Gemini), hybrid retrieval (ChromaDB + BM25 + FlashRank reranking), semantic caching via Redis, live database queries, intent-based routing, role-based personas, and built-in university FAQs and study resources.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **MongoDB** | Chat message persistence (Motor async driver) |
| **Redis** | Semantic cache (CAG engine) |
| **ChromaDB** | Vector database for RAG retrieval |
| **Groq** | Primary LLM provider (llama-3.1-8b-instant) |
| **Google Gemini** | Embedding + LLM fallback (text-embedding-004, gemini-2.0-flash) |
| **Sentence-Transformers** | Local embedding fallback (all-MiniLM-L6-v2) |
| **PostgreSQL** | Live database queries via asyncpg |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
ai-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py              # Settings & environment variables
    ├── database.py            # MongoDB + Redis connections
    ├── dependencies.py        # JWT auth dependency
    ├── main.py                # FastAPI app entrypoint
    ├── routes.py              # API endpoints (7 routes)
    ├── schemas.py             # Pydantic request/response schemas
    └── ai_assistant/
        ├── __init__.py
        ├── pipeline.py        # Main 9-step orchestrator
        ├── rag_engine.py      # Hybrid retrieval (ChromaDB + BM25 + RRF + FlashRank)
        ├── cag_engine.py      # Redis semantic cache
        ├── llm_manager.py     # Multi-key LLM rotation (Groq + Gemini)
        ├── router_engine.py   # Intent classification (keyword + LLM)
        ├── persona.py         # Role-based system prompts
        ├── knowledge_base.py  # Built-in FAQs + study resources
        └── db_query_engine.py # Live PostgreSQL queries
```

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEMINI_API_KEYS` | `str` | `""` | Comma-separated Gemini API keys (up to 10) |
| `GROQ_API_KEYS` | `str` | `""` | Comma-separated Groq API keys |
| `GEMINI_API_KEY` | `str` | `""` | Legacy single Gemini key (merged into pool) |
| `CHROMA_HOST` | `str` | `chromadb` | ChromaDB hostname |
| `CHROMA_PORT` | `int` | `8000` | ChromaDB port |
| `REDIS_URL` | `str` | `redis://redis:6379` | Redis connection string |
| `MONGO_URL` | `str` | `mongodb://mongodb:27017/nexus_chat` | MongoDB connection string |
| `DATABASE_URL` | `str` | `""` | PostgreSQL connection (for db_query_engine) |
| `KAFKA_BROKER` | `str` | `kafka:9092` | Kafka broker address |
| `JWT_SECRET` | `str` | `changeme` | Secret key for JWT signing |
| `JWT_ALGORITHM` | `str` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `int` | `60` | Token expiry in minutes |
| `CAG_SIMILARITY_THRESHOLD` | `float` | `0.90` | Cosine similarity threshold for cache hits |
| `CAG_TTL_SECONDS` | `int` | `86400` | Cache entry TTL (24 hours) |

## Pipeline Architecture (9 Steps)

```
[1] CAG Cache Lookup ──hit──→ Return cached answer
        │ miss
[2] Built-in FAQ Check ──hit──→ Cache & return
        │ miss
[3] Intent Routing (keyword guards → LLM fallback)
        │
[4] DB Query (if intent = db_query) ──→ Live PostgreSQL
[5] RAG Retrieval (if intent = study_help/faq)
[6] Study Resources (if study_help)
[7] Handle general/system intents
        │
[8] LLM Generation (Groq → Gemini fallback)
        │
[9] Cache Update (store in CAG)
```

## RAG Engine — 5-Stage Hybrid Retrieval

| Stage | Technology | Description |
|-------|------------|-------------|
| 1 | NLTK WordNet | Query expansion with synonyms |
| 2 | ChromaDB | Semantic vector search across collections |
| 3 | BM25 (rank_bm25) | Lexical keyword search |
| 4 | RRF | Reciprocal Rank Fusion merge (k=60) |
| 5 | FlashRank | Cross-encoder reranking (ms-marco-MiniLM-L-12-v2) |

## ChromaDB Collections

| Collection | Type | Access |
|------------|------|--------|
| `vectors_faq_knowledge` | Static | All roles |
| `vectors_university_policies` | Static | All roles |
| `vectors_course_materials` | Dynamic | Students, Faculty, Admin |
| `vectors_student_transcripts` | Dynamic | Students, Faculty, Admin |

## CAG Semantic Cache (Redis)

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `ai:cag:{md5_hash}` | 24 hours | Cached (vector, answer) pairs |

- Cosine similarity ≥ 0.90 = cache hit
- Fallback to local RAM if Redis unavailable

## LLM Manager — Multi-Key Rotation

| Provider | Model | Role | Retry Strategy |
|----------|-------|------|----------------|
| **Groq** | `llama-3.1-8b-instant` | Primary generation | Round-robin up to 5 keys, 60s cooldown on 429 |
| **Gemini** | `text-embedding-004` | Embeddings | Round-robin up to 3 keys, 60s cooldown on quota |
| **Gemini** | `gemini-2.0-flash` | Generation fallback | Same key pool as embeddings |
| **Sentence-Transformers** | `all-MiniLM-L6-v2` | Local embedding fallback | Used if all Gemini keys fail |

## Intent Router — Two-Phase Classification

| Phase | Method | Latency |
|-------|--------|---------|
| 1 | Keyword guards (18+ keyword sets) | 0ms |
| 2 | LLM classification (fallback) | ~200ms |

**Intent Categories:** `db_query`, `study_help`, `faq`, `general_chat`, `system_action`
**Study Sub-intents (10):** coding_example, debugging, summarization, simplified_explanation, theoretical_explanation, comparison, pros_cons, step_by_step, quiz_practice, historical_context

## Role-Based Personas

| Role | Tone | Capabilities |
|------|------|--------------|
| **Student** | Friendly, supportive | Grades, GPA, attendance, deadlines, study help, FAQs |
| **Faculty** | Professional, efficient | Sections, at-risk students, attendance summaries |
| **Admin** | Executive, data-driven | University-wide stats, financials, system status |

## DB Query Engine — Live PostgreSQL

| Role | Available Queries |
|------|------------------|
| **Student** | Profile, GPA, attendance, courses, pending fees, upcoming deadlines, quiz scores |
| **Faculty** | Sections with enrollment counts, at-risk students |
| **Admin** | Dashboard stats (totals, revenue, at-risk count) |

## Knowledge Base — Built-in Data

- **8 University FAQs:** admission, fee structure, grading policy, attendance policy, drop course, scholarship, library, exam
- **10 Study Topics:** Data Structures, Algorithms, Database, OOP, Python, Web Dev, ML, OS, Networking, Math
- **50+ Topic Aliases:** e.g., "dsa" → "data structures", "sql" → "database"

## MongoDB Collections

| Collection | Database | Description |
|------------|----------|-------------|
| `ai_chat_messages` | `nexus_chat` | Individual chat messages (user & assistant) |
| `ai_chat_sessions` | `nexus_chat` | Chat session tracking |

## API Endpoints

All endpoints are prefixed with `/api/v1/ai`.

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | `POST` | `/chat` | Yes | Main conversational endpoint (full CAG+RAG pipeline) |
| 2 | `GET` | `/chat/history` | Yes | Retrieve chat history (optional session_id filter) |
| 3 | `DELETE` | `/chat/history` | Yes | Clear all chat history + flush Redis caches |
| 4 | `POST` | `/study-help` | Yes | Get study resources and improvement advice |
| 5 | `POST` | `/embed-document` | Admin only | Ingest document into ChromaDB collection |
| 6 | `GET` | `/status` | Yes | AI service health (key counts, cache stats) |
| 7 | `GET` | `/health` | No | Health check (Docker HEALTHCHECK) |

## Docker Configuration

| Property | Value |
|----------|-------|
| Base Image | `python:3.11-slim` |
| System Packages | `gcc`, `g++` (native extensions) |
| Exposed Port | `8000` |
| Healthcheck | Python urllib check on `/health` (15s interval, 30s start) |
| Entrypoint | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

## Dependencies (requirements.txt)

```
fastapi
uvicorn[standard]
pydantic-settings
python-jose[cryptography]
google-generativeai
groq
chromadb
rank-bm25
flashrank
sentence-transformers
nltk
redis[hiredis]
motor
asyncpg
numpy
scikit-learn
```
