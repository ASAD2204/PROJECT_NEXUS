from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
from datetime import datetime
from bson import ObjectId
import httpx
import motor.motor_asyncio
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
    EmailSessionCreate,
)
from app.database import chat_sessions, chat_messages, redis_client, mongo_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])

AUTH_SERVICE_URL = "http://auth-service:8000/api/v1/auth"
MAX_GROUP_PARTICIPANTS = 100
fs = motor.motor_asyncio.AsyncIOMotorGridFSBucket(mongo_db)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    file_id = await fs.upload_from_stream(
        file.filename, 
        await file.read(), 
        metadata={"content_type": file.content_type, "uploader_id": user["user_id"]}
    )
    return {
        "file_url": f"/api/v1/chat/files/{str(file_id)}",
        "file_type": file.content_type or "application/octet-stream",
        "file_name": file.filename
    }


@router.get("/files/{file_id}")
async def get_file(file_id: str):
    try:
        grid_out = await fs.open_download_stream(ObjectId(file_id))
        
        async def iterfile():
            while True:
                chunk = await grid_out.readchunk()
                if not chunk:
                    break
                yield chunk
        
        content_type = grid_out.metadata.get("content_type", "application/octet-stream")
        return StreamingResponse(iterfile(), media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


async def _resolve_user_names(user_ids: List[str]) -> dict:
    """Helper to fetch multiple user names from auth-service."""
    user_map = {}
    if not user_ids:
        return user_map
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/users/bulk",
                json=user_ids,
                timeout=5.0
            )
            if resp.status_code == 200:
                for u_data in resp.json():
                    user_map[u_data["user_id"]] = f"{u_data.get('first_name', '')} {u_data.get('last_name', '')}".strip() or u_data["email"]
        except Exception as e:
            print(f"Failed to fetch user names: {e}")
    return user_map


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
    
    # ── Resolve Names for 1-to-1 chats ──
    # Gather all unique participant IDs across all sessions
    all_participant_ids = set()
    for s in sessions:
        all_participant_ids.update(s.get("participants", []))
    
    user_map = await _resolve_user_names(list(all_participant_ids))

    for session in sessions:
        session_id = str(session["_id"])
        
        # Determine name for 1-to-1 chat
        session_name = session.get("name")
        if not session_name and not session.get("is_group", False):
            # Find the other participant's name
            other_id = next((pid for pid in session["participants"] if pid != user_id), None)
            if other_id:
                session_name = user_map.get(other_id, f"User {other_id[:8]}")

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
                is_group=session.get("is_group", False),
                name=session_name,
                role_map=session.get("role_map"),
            )
        )

    # Sort so the conversation with the newest message comes first.
    # Sessions with no messages yet sort to the bottom.
    conversations.sort(
        key=lambda c: c.last_message_at or "",
        reverse=True,
    )

    return conversations


@router.post("/sessions/by-email", response_model=SessionOut)
async def add_by_email(
    body: EmailSessionCreate,
    user: dict = Depends(get_current_user),
):
    """Start a session by looking up the user's email."""
    if body.email.lower() == user.get("email", "").lower():
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")

    async with httpx.AsyncClient() as client:
        try:
            # Internal call to auth-service
            resp = await client.get(f"{AUTH_SERVICE_URL}/users/by-email/{body.email}")
            if resp.status_code != 200:
                raise HTTPException(status_code=404, detail="User with this email not found")
            
            target_user = resp.json()
            target_id = target_user["user_id"]
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=404, detail="User with this email not found")

    participants = sorted([user["user_id"], target_id])

    # Check for an existing session
    existing = await chat_sessions.find_one({
        "participants": participants,
        "is_group": {"$ne": True}
    })
    if existing:
        return SessionOut(
            session_id=str(existing["_id"]),
            name=target_user.get("name") or target_user.get("full_name"),
            participants=existing["participants"],
            created_at=existing["created_at"],
        )

    now = datetime.utcnow().isoformat()
    doc = {
        "participants": participants,
        "is_group": False,
        "created_at": now,
        "role_map": {
            user["user_id"]: user["role"],
            target_id: target_user["role"]
        }
    }
    result = await chat_sessions.insert_one(doc)

    return SessionOut(
        session_id=str(result.inserted_id),
        name=target_user.get("name") or target_user.get("full_name"),
        participants=participants,
        created_at=now,
    )


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

    # Resolve sender names
    sender_ids = list(set(msg["sender_id"] for msg in messages))
    user_map = await _resolve_user_names(sender_ids)

    return [
        MessageOut(
            message_id=str(msg["_id"]),
            session_id=msg.get("conversation_id", session_id),
            sender_id=msg["sender_id"],
            sender_name=user_map.get(msg["sender_id"]),
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
    """Create a group chat and enforce max participant limit (100).
    Supports upsert via external_id for system-generated groups.
    """
    creator_id = user["user_id"]
    deduped = sorted(set(body.participant_ids + [creator_id]))
    if len(deduped) < 2:
        raise HTTPException(status_code=400, detail="Group must contain at least 2 participants")
    if len(deduped) > MAX_GROUP_PARTICIPANTS:
        raise HTTPException(status_code=400, detail="Group chat cannot exceed 100 participants")

    if body.external_id:
        existing = await chat_sessions.find_one({"external_id": body.external_id})
        if existing:
            await chat_sessions.update_one(
                {"_id": existing["_id"]},
                {"$set": {"participants": deduped, "name": body.name}}
            )
            return GroupOut(
                session_id=str(existing["_id"]),
                name=body.name,
                participants=deduped,
                created_at=existing["created_at"],
            )

    now = datetime.utcnow().isoformat()
    doc = {
        "participants": deduped,
        "name": body.name,
        "is_group": True,
        "created_by": creator_id,
        "created_at": now,
        "external_id": body.external_id,
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

    sender_id = user["user_id"]
    # Resolve sender name
    user_map = await _resolve_user_names([sender_id])
    sender_name = user_map.get(sender_id)

    doc = {
        "conversation_id": session_id,
        "sender_id": sender_id,
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
        sender_id=sender_id,
        sender_name=sender_name,
        content=doc["content"],
        attachments=doc["attachments"],
        timestamp=doc["timestamp"],
        is_read=False,
        message_type=message_type,
    )


# ---------------------------------------------------------------------------
# POST /sync  -  automatically create section groups and teacher contacts
# ---------------------------------------------------------------------------
@router.post("/sync", response_model=MessageResponse)
async def sync_academic_contacts(
    user: dict = Depends(get_current_user),
):
    """
    Sync academic contacts:
    1. For students: Create 1-to-1 chats with teachers and group chats for sections.
    2. For faculty: Create group chats for sections they teach.
    """
    user_id = user["user_id"]
    role = user["role"]
    
    SIS_SERVICE_URL = "http://sis-service:8000/api/v1/sis"
    LMS_SERVICE_URL = "http://lms-service:8000/api/v1/lms"
    
    async with httpx.AsyncClient() as client:
        if role == "student":
            # 1. Get enrollments
            resp = await client.get(f"{SIS_SERVICE_URL}/enrollments/me", headers={"Authorization": f"Bearer {user['token']}"})
            if resp.status_code != 200:
                return MessageResponse(message="Failed to fetch enrollments")
            
            enrollments = resp.json()
            for enr in enrollments:
                section_id = enr["section_id"]
                
                # 2. Get section participants (teacher and classmates)
                part_resp = await client.get(f"{SIS_SERVICE_URL}/sections/{section_id}/participants", headers={"Authorization": f"Bearer {user['token']}"})
                if part_resp.status_code != 200:
                    continue
                
                participants_data = part_resp.json()
                faculty = participants_data.get("faculty")
                students = participants_data.get("students", [])
                
                # 3. Create/Update 1-to-1 with teacher
                if faculty:
                    target_id = faculty["user_id"]
                    p_list = sorted([user_id, target_id])
                    await chat_sessions.update_one(
                        {"participants": p_list, "is_group": False},
                        {"$setOnInsert": {
                            "participants": p_list,
                            "is_group": False,
                            "created_at": datetime.utcnow().isoformat(),
                            "role_map": {user_id: "student", target_id: "faculty"}
                        }},
                        upsert=True
                    )
                
                # 4. Create/Update Section Group
                # Get section name from LMS
                sec_resp = await client.get(f"{LMS_SERVICE_URL}/sections/{section_id}", headers={"Authorization": f"Bearer {user['token']}"})
                section_name = f"Section {section_id}"
                if sec_resp.status_code == 200:
                    sec_data = sec_resp.json()
                    # In a real app we'd get course title too
                    section_name = f"Class Group: Section {section_id}"
                
                all_participant_ids = [s["user_id"] for s in students]
                if faculty:
                    all_participant_ids.append(faculty["user_id"])
                
                all_participant_ids = sorted(list(set(all_participant_ids)))
                
                external_id = f"section_{section_id}"
                await chat_sessions.update_one(
                    {"external_id": external_id},
                    {"$set": {
                        "participants": all_participant_ids,
                        "name": section_name,
                        "is_group": True,
                        "external_id": external_id,
                        "created_at": datetime.utcnow().isoformat()
                    }},
                    upsert=True
                )
        
        elif role == "faculty":
            # 1. Get faculty profile to find faculty_id
            prof_resp = await client.get(f"{SIS_SERVICE_URL}/faculty/me", headers={"Authorization": f"Bearer {user['token']}"})
            if prof_resp.status_code != 200:
                return MessageResponse(message="Failed to fetch faculty profile")
            
            faculty_data = prof_resp.json()
            faculty_id = faculty_data.get("faculty_id")

            # 2. Get sections for this faculty
            # Note: Using lms-service to get sections. We'll filter by faculty_id.
            sec_resp = await client.get(f"{LMS_SERVICE_URL}/sections", headers={"Authorization": f"Bearer {user['token']}"})
            if sec_resp.status_code == 200:
                all_sections = sec_resp.json()
                # If it's a list or object depends on the API. LMS /sections usually returns a list or {sections: []}
                sections_list = all_sections.get("sections", all_sections) if isinstance(all_sections, dict) else all_sections
                
                my_sections = [s for s in sections_list if s.get("faculty_id") == faculty_id]
                
                for section in my_sections:
                    section_id = section["section_id"]
                    
                    # Get section participants
                    part_resp = await client.get(f"{SIS_SERVICE_URL}/sections/{section_id}/participants", headers={"Authorization": f"Bearer {user['token']}"})
                    if part_resp.status_code != 200:
                        continue
                    
                    participants_data = part_resp.json()
                    students = participants_data.get("students", [])
                    
                    # Create/Update Section Group
                    all_participant_ids = [s["user_id"] for s in students]
                    all_participant_ids.append(user_id) # Add current faculty user
                    all_participant_ids = sorted(list(set(all_participant_ids)))
                    
                    section_name = f"Class Group: Section {section_id}"
                    external_id = f"section_{section_id}"
                    
                    await chat_sessions.update_one(
                        {"external_id": external_id},
                        {"$set": {
                            "participants": all_participant_ids,
                            "name": section_name,
                            "is_group": True,
                            "external_id": external_id,
                            "created_at": datetime.utcnow().isoformat()
                        }},
                        upsert=True
                    )

    return MessageResponse(message="Academic contacts synced successfully")
