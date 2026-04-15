from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from datetime import datetime
from bson import ObjectId

from app.schemas import (
    SessionCreate,
    SessionOut,
    GroupCreate,
    GroupMembersUpdate,
    GroupOut,
    MessageOut,
    MessageCreate,
    ConversationOut,
    MessageResponse,
)
from app.database import chat_sessions, chat_messages, redis_client
from app.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])

MAX_GROUP_PARTICIPANTS = 100


# ---------------------------------------------------------------------------
# GET /conversations  -  list the current user's conversations
# ---------------------------------------------------------------------------
@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(user: dict = Depends(get_current_user)):
    """Return every conversation the authenticated user participates in,
    sorted by the most recent message (descending)."""

    user_id = user["user_id"]

    # Find all sessions where the current user is a participant
    cursor = chat_sessions.find({"participants": user_id})
    sessions = await cursor.to_list(length=200)

    conversations: list = []

    for session in sessions:
        session_id = str(session["_id"])

        # Grab the latest message in this session (if any)
        last_msg_cursor = (
            chat_messages.find({"conversation_id": session_id})
            .sort("timestamp", -1)
            .limit(1)
        )
        last_msgs = await last_msg_cursor.to_list(length=1)

        last_message = None
        last_message_at = None
        if last_msgs:
            last_message = last_msgs[0].get("content")
            last_message_at = last_msgs[0].get("timestamp")

        conversations.append(
            ConversationOut(
                session_id=session_id,
                participants=session["participants"],
                last_message=last_message,
                last_message_at=last_message_at,
            )
        )

    # Sort so the conversation with the newest message comes first.
    # Sessions with no messages yet sort to the bottom.
    conversations.sort(
        key=lambda c: c.last_message_at or "",
        reverse=True,
    )

    return conversations


@router.get("/sessions", response_model=List[SessionOut])
async def list_sessions(user: dict = Depends(get_current_user)):
    """List all sessions for the authenticated user."""
    user_id = user["user_id"]
    cursor = chat_sessions.find({"participants": user_id}).sort("created_at", -1)
    sessions = await cursor.to_list(length=200)
    return [
        SessionOut(
            session_id=str(s["_id"]),
            participants=s.get("participants", []),
            created_at=s.get("created_at", ""),
        )
        for s in sessions
    ]


@router.get("/online")
async def get_online_users(_user: dict = Depends(get_current_user)):
    """Return users currently marked online by WebSocket heartbeat keys."""
    online_users = []
    async for key in redis_client.scan_iter(match="chat:online:*"):
        online_users.append(key.replace("chat:online:", "", 1))
    return {"online_users": online_users, "count": len(online_users)}


# ---------------------------------------------------------------------------
# GET /messages/{session_id}  -  paginated message history
# ---------------------------------------------------------------------------
@router.get("/messages/{session_id}", response_model=List[MessageOut])
async def get_messages(
    session_id: str,
    skip: int = Query(0, ge=0, description="Number of messages to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max messages to return"),
    user: dict = Depends(get_current_user),
):
    """Return messages for a given session, oldest-first."""

    # Ensure the session exists and the user is a participant
    session = await chat_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    if user["user_id"] not in session.get("participants", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant of this session",
        )

    cursor = (
        chat_messages.find({"conversation_id": session_id})
        .sort("timestamp", 1)
        .skip(skip)
        .limit(limit)
    )
    messages = await cursor.to_list(length=limit)

    return [
        MessageOut(
            message_id=str(msg["_id"]),
            session_id=msg.get("conversation_id", session_id),
            sender_id=msg["sender_id"],
            content=msg["content"],
            attachments=msg.get("attachments", []),
            timestamp=msg["timestamp"],
            is_read=msg.get("is_read", False),
            message_type=msg.get("message_type", "text"),
        )
        for msg in messages
    ]


# ---------------------------------------------------------------------------
# POST /sessions  -  create (or return existing) 1-to-1 session
# ---------------------------------------------------------------------------
@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    user: dict = Depends(get_current_user),
):
    """Start a new 1-to-1 chat session between two users.

    If a session already exists between the same participants it is returned
    instead of creating a duplicate.
    """

    participants = sorted(body.participant_ids)

    if len(participants) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exactly two participant IDs are required for a 1-to-1 session",
        )

    if user["user_id"] not in participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be one of the participants",
        )

    # Check for an existing session between the same two users
    existing = await chat_sessions.find_one({"participants": participants})
    if existing:
        return SessionOut(
            session_id=str(existing["_id"]),
            participants=existing["participants"],
            created_at=existing["created_at"],
        )

    # Create a new session
    now = datetime.utcnow().isoformat()
    doc = {
        "participants": participants,
        "created_at": now,
    }
    result = await chat_sessions.insert_one(doc)

    return SessionOut(
        session_id=str(result.inserted_id),
        participants=participants,
        created_at=now,
    )


@router.get("/groups", response_model=List[GroupOut])
async def list_groups(user: dict = Depends(get_current_user)):
    """List all group sessions for the authenticated user."""
    user_id = user["user_id"]
    cursor = chat_sessions.find({"participants": user_id, "is_group": True}).sort("created_at", -1)
    groups = await cursor.to_list(length=200)
    return [
        GroupOut(
            session_id=str(g["_id"]),
            name=g.get("name", "Untitled Group"),
            participants=g.get("participants", []),
            created_at=g.get("created_at", ""),
        )
        for g in groups
    ]


@router.post("/groups", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    user: dict = Depends(get_current_user),
):
    """Create a group chat and enforce max participant limit (100)."""
    creator_id = user["user_id"]
    deduped = sorted(set(body.participant_ids + [creator_id]))
    if len(deduped) < 2:
        raise HTTPException(status_code=400, detail="Group must contain at least 2 participants")
    if len(deduped) > MAX_GROUP_PARTICIPANTS:
        raise HTTPException(status_code=400, detail="Group chat cannot exceed 100 participants")

    now = datetime.utcnow().isoformat()
    doc = {
        "participants": deduped,
        "name": body.name,
        "is_group": True,
        "created_by": creator_id,
        "created_at": now,
    }
    result = await chat_sessions.insert_one(doc)
    return GroupOut(
        session_id=str(result.inserted_id),
        name=body.name,
        participants=deduped,
        created_at=now,
    )


@router.put("/groups/{session_id}/members", response_model=GroupOut)
async def add_group_members(
    session_id: str,
    body: GroupMembersUpdate,
    user: dict = Depends(get_current_user),
):
    """Add members to an existing group while enforcing participant cap."""
    session = await chat_sessions.find_one({"_id": ObjectId(session_id), "is_group": True})
    if not session:
        raise HTTPException(status_code=404, detail="Group not found")

    if user["user_id"] not in session.get("participants", []):
        raise HTTPException(status_code=403, detail="Only group participants can add members")

    updated_participants = sorted(set(session.get("participants", []) + body.participant_ids))
    if len(updated_participants) > MAX_GROUP_PARTICIPANTS:
        raise HTTPException(status_code=400, detail="Group chat cannot exceed 100 participants")

    await chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"participants": updated_participants}},
    )

    refreshed = await chat_sessions.find_one({"_id": ObjectId(session_id)})
    return GroupOut(
        session_id=str(refreshed["_id"]),
        name=refreshed.get("name", "Untitled Group"),
        participants=refreshed.get("participants", []),
        created_at=refreshed.get("created_at", ""),
    )


@router.post("/messages/{session_id}", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    session_id: str,
    body: MessageCreate,
    user: dict = Depends(get_current_user),
):
    """Send a message over REST (for clients not using WebSocket send)."""
    session = await chat_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if user["user_id"] not in session.get("participants", []):
        raise HTTPException(status_code=403, detail="You are not a participant of this session")

    message_type = body.message_type
    if body.attachments and message_type == "text":
        message_type = "file"

    doc = {
        "conversation_id": session_id,
        "sender_id": user["user_id"],
        "content": body.content,
        "attachments": [a.model_dump() for a in body.attachments],
        "timestamp": datetime.utcnow().isoformat(),
        "is_read": False,
        "message_type": message_type,
    }
    result = await chat_messages.insert_one(doc)

    return MessageOut(
        message_id=str(result.inserted_id),
        session_id=session_id,
        sender_id=doc["sender_id"],
        content=doc["content"],
        attachments=doc["attachments"],
        timestamp=doc["timestamp"],
        is_read=False,
        message_type=message_type,
    )
