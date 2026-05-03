from typing import Any, Optional

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "info"
    priority: str = "medium"
    action_url: Optional[str] = None
    metadata: Optional[Any] = None
    expires_at: Optional[str] = None


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    priority: str = "medium"
    is_read: bool = False
    read_at: Optional[str] = None
    created_at: str
    expires_at: Optional[str] = None
    action_url: Optional[str] = None
    metadata: Optional[Any] = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: list[str] = ["all"]
    priority: str = "high"


class AnnouncementOut(BaseModel):
    id: str
    title: str
    content: str
    author_id: str
    target_audience: list[str]
    priority: str
    published_at: str


class MessageResponse(BaseModel):
    message: str
