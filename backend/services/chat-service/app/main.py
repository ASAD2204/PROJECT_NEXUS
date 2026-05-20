from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from bson import ObjectId
import logging

from app.routes import router
from app.websocket_manager import manager
from app.database import chat_messages, chat_sessions, redis_client
from app.dependencies import verify_ws_token

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Chat Service - Project Nexus",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the REST router
app.include_router(router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Startup — create MongoDB indexes
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def create_indexes():
    """Ensure MongoDB indexes exist per FYP spec."""
    try:
        # chat_messages indexes
        await chat_messages.create_index("conversation_id")
        await chat_messages.create_index("sender_id")
        await chat_messages.create_index("timestamp")
        await chat_messages.create_index(
            [("conversation_id", 1), ("timestamp", 1)],
            name="conversation_timestamp_compound",
        )
        # chat_sessions indexes
        await chat_sessions.create_index("participants")
        logger.info("MongoDB indexes created for chat-service")
    except Exception as exc:
        logger.error("Failed to create MongoDB indexes: %s", exc)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "chat-service"}


import httpx

AUTH_SERVICE_URL = "http://auth-service:8000/api/v1/auth"

async def _get_sender_name(user_id: str) -> str:
    """Helper to fetch a single user name from auth-service."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/users/bulk",
                json=[user_id],
                timeout=2.0
            )
            if resp.status_code == 200:
                u_data = resp.json()[0]
                return f"{u_data.get('first_name', '')} {u_data.get('last_name', '')}".strip() or u_data["email"]
        except Exception:
            pass
    return f"User {user_id[:8]}"

# ... (keep existing code until websocket_endpoint)

@app.websocket("/api/v1/chat/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    # Authenticate via the JWT token supplied as a query parameter
    user = verify_ws_token(token)
    if not user:
        await websocket.close(code=4001)
        return

    try:
        session = await chat_sessions.find_one({"_id": ObjectId(session_id)})
    except Exception:
        session = None

    if not session:
        await websocket.close(code=4004)
        return

    if user["user_id"] not in session.get("participants", []):
        await websocket.close(code=4003)
        return

    user_id = user["user_id"]
    await manager.connect(websocket, session_id, user_id)
    sender_name = await _get_sender_name(user_id)

    # Mark the user as online in Redis (FYP Table 150 — 2-minute heartbeat TTL)
    await redis_client.set(f"chat:online:{user_id}", "online", ex=120)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            # 1. Heartbeat / Presence
            if msg_type == "heartbeat":
                await redis_client.set(f"chat:online:{user_id}", "online", ex=120)
                continue

            # 2. Typing Indicators (Transient - not persisted)
            if msg_type == "typing":
                await manager.broadcast_global({
                    "type": "typing",
                    "user_id": user_id,
                    "session_id": session_id,
                    "is_typing": data.get("is_typing", True)
                }, session_id)
                continue

            # 3. Read Receipts
            if msg_type == "read_receipt":
                msg_id = data.get("message_id")
                if msg_id:
                    await chat_messages.update_one(
                        {"_id": ObjectId(msg_id)},
                        {"$set": {"is_read": True}}
                    )
                    await manager.broadcast_global({
                        "type": "read_receipt",
                        "message_id": msg_id,
                        "session_id": session_id,
                        "user_id": user_id
                    }, session_id)
                continue

            # 4. Message Reactions
            if msg_type == "reaction":
                msg_id = data.get("message_id")
                reaction = data.get("reaction") # e.g. "👍"
                if msg_id and reaction:
                    # Store reactions as a map: { emoji: [user_ids] }
                    field = f"reactions.{reaction}"
                    await chat_messages.update_one(
                        {"_id": ObjectId(msg_id)},
                        {"$addToSet": {field: user_id}}
                    )
                    await manager.broadcast_global({
                        "type": "reaction",
                        "message_id": msg_id,
                        "reaction": reaction,
                        "user_id": user_id,
                        "session_id": session_id
                    }, session_id)
                continue

            # 5. Standard Messages
            # Parse optional attachments [{file_url, file_type, file_size}]
            attachments = data.get("attachments", [])
            message_type = data.get("message_type", "text")
            if attachments and message_type == "text":
                message_type = "file"

            # Persist the message in MongoDB (FYP spec fields)
            message_doc = {
                "conversation_id": session_id,
                "sender_id": user_id,
                "sender_name": sender_name,
                "content": data.get("content", ""),
                "attachments": attachments,
                "timestamp": datetime.utcnow().isoformat(),
                "is_read": False,
                "message_type": message_type,
            }
            result = await chat_messages.insert_one(message_doc)

            # Prepare the payload for broadcast (replace Mongo _id with a string)
            broadcast_doc = {**message_doc}
            broadcast_doc["message_id"] = str(result.inserted_id)
            broadcast_doc["session_id"] = session_id
            broadcast_doc["type"] = "message"
            broadcast_doc.pop("_id", None)

            # Broadcast the message GLOBAL (all instances)
            await manager.broadcast_global(broadcast_doc, session_id)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id, user_id)
        await redis_client.delete(f"chat:online:{user_id}")
