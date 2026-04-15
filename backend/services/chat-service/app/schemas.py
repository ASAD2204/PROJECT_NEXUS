from pydantic import BaseModel, Field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Attachment schema (embedded in chat messages)
# ---------------------------------------------------------------------------

class Attachment(BaseModel):
    file_url: str
    file_type: str
    file_size: int = 0


# ---------------------------------------------------------------------------
# Session schemas
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    """Request body to start a new 1-to-1 chat session."""
    participant_ids: List[str]


class SessionOut(BaseModel):
    """Response body for a newly created (or existing) session."""
    session_id: str
    participants: List[str]
    created_at: str


class GroupCreate(BaseModel):
    """Request body to create a group chat session."""
    name: str
    participant_ids: List[str]


class GroupMembersUpdate(BaseModel):
    """Request body to add members to an existing group chat."""
    participant_ids: List[str]


class GroupOut(BaseModel):
    """Response body for group chat metadata."""
    session_id: str
    name: str
    participants: List[str]
    created_at: str


# ---------------------------------------------------------------------------
# Message schemas
# ---------------------------------------------------------------------------

class MessageOut(BaseModel):
    """A single chat message returned from the history endpoint."""
    message_id: str
    session_id: str
    sender_id: str
    content: str
    attachments: List[Attachment] = []
    timestamp: str
    is_read: bool = False
    message_type: str = "text"


class MessageCreate(BaseModel):
    """Request body for REST-based message send."""
    content: str = ""
    attachments: List[Attachment] = []
    message_type: str = "text"


class ConversationOut(BaseModel):
    """Summary of a conversation shown in the conversation list."""
    session_id: str
    participants: List[str]
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
