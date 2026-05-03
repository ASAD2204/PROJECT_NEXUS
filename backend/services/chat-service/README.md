# Chat Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> **Real-time P2P Chat microservice for Project Nexus**

## Overview

The Chat Service provides real-time peer-to-peer messaging via WebSocket connections with MongoDB persistence. It tracks online presence using Redis with a 2-minute heartbeat TTL and supports file attachments in messages.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework (REST + WebSocket) |
| **MongoDB** | Chat sessions and messages (Motor async driver) |
| **Redis** | Online presence tracking (async) |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
chat-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py              # Settings & environment variables
    ├── database.py            # MongoDB + Redis connections
    ├── dependencies.py        # JWT auth (HTTP + WebSocket)
    ├── main.py                # FastAPI app, WebSocket endpoint, startup events
    ├── routes.py              # REST API endpoints
    ├── schemas.py             # Pydantic request/response schemas
    └── websocket_manager.py   # WebSocket connection manager
```

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MONGO_URL` | `str` | `mongodb://mongodb:27017/nexus_chat` | MongoDB connection string |
| `REDIS_URL` | `str` | `redis://redis:6379` | Redis connection string |
| `KAFKA_BROKER` | `str` | `kafka:9092` | Kafka broker address |
| `JWT_SECRET` | `str` | *required* | Secret key for JWT signing |
| `JWT_ALGORITHM` | `str` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `int` | `60` | Token expiry in minutes |

## MongoDB Collections

| Collection | Database | Description |
|------------|----------|-------------|
| `chat_sessions` | `nexus_chat` | 1-to-1 chat session records (participants array) |
| `chat_messages` | `nexus_chat` | Individual chat messages with content, attachments, timestamps |

**Indexes created on startup:**
- `chat_messages`: `conversation_id`, `sender_id`, `timestamp`, compound `(conversation_id, timestamp)`
- `chat_sessions`: `participants`

## Redis Usage

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `chat:online:{user_id}` | 120 seconds | Online presence indicator (value: "online", refreshed on each WebSocket message) |

## WebSocket Flow

```
Client connects: WS /api/v1/chat/ws/{session_id}?token=JWT
    │
    ├── Token validated (4001 close code if invalid)
    ├── Connection registered in ConnectionManager
    ├── User marked online in Redis (120s TTL)
    │
    ├── Message received (JSON)
    │   ├── Persist to MongoDB (chat_messages)
    │   └── Broadcast to all session connections
    │
    └── Disconnect
        ├── Connection removed from manager
        └── Redis online key deleted
```

## API Endpoints

### REST Endpoints (prefixed with `/api/v1/chat`)

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | `GET` | `/conversations` | Yes | List all conversations for authenticated user (sorted by most recent) |
| 2 | `GET` | `/sessions/by-email` | Yes | Start a session by looking up user by email |
| 3 | `GET` | `/sessions` | Yes | List all 1-to-1 sessions |
| 4 | `POST` | `/sessions` | Yes | Create 1-to-1 chat session (or return existing) |
| 5 | `GET` | `/groups` | Yes | List all group chats |
| 6 | `POST` | `/groups` | Yes | Create a group chat (up to 100 members) |
| 7 | `PUT` | `/groups/{session_id}/members` | Yes | Add members to a group chat |
| 8 | `GET` | `/messages/{session_id}` | Yes | Paginated message history (skip, limit, oldest-first) |
| 9 | `POST` | `/messages/{session_id}` | Yes | Send a message via REST (backup for non-WS clients) |
| 10 | `GET` | `/online` | Yes | Get list of currently online user IDs |
| 11 | `POST` | `/sync` | Yes | Sync academic contacts (auto-create teacher chats & section groups) |
| 12 | `GET` | `/health` | No | Health check |

### WebSocket Endpoint
...
| Protocol | Path | Auth |
|----------|------|------|
| `WS` | `/api/v1/chat/ws/{session_id}?token=...` | JWT as query parameter |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |

## Pydantic Schemas

| Schema | Purpose |
|--------|---------|
| `Attachment` | File attachment (file_url, file_type, file_size) |
| `SessionCreate` | Create session (participant_ids list) |
| `SessionOut` | Session response (session_id, participants, created_at) |
| `MessageOut` | Chat message (message_id, sender_id, content, attachments, timestamp, is_read, message_type) |
| `ConversationOut` | Conversation summary (session_id, participants, last_message, last_message_at) |
| `MessageResponse` | Generic message response |

## WebSocket Manager

`ConnectionManager` class managing active connections per session:

| Method | Description |
|--------|-------------|
| `connect(websocket, session_id)` | Accept and register connection |
| `disconnect(websocket, session_id)` | Remove connection, cleanup empty sessions |
| `broadcast(message, session_id)` | Send JSON to all connections in session |
| `send_personal(message, websocket)` | Send JSON to a single connection |

## Authentication

| Dependency | Usage | Description |
|------------|-------|-------------|
| `get_current_user` | REST endpoints | Extracts JWT from Bearer header |
| `verify_ws_token` | WebSocket | Extracts JWT from query param `?token=...`, returns None on failure |

## Docker Configuration

| Property | Value |
|----------|-------|
| Base Image | `python:3.11-slim` |
| Exposed Port | `8000` |
| Healthcheck | Python urllib check on `/health` (15s interval, 5s timeout) |
| Entrypoint | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

## Dependencies (requirements.txt)

```
fastapi
uvicorn[standard]
pydantic-settings
python-jose[cryptography]
motor
redis
```
