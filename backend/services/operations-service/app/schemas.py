from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class GrievanceCreate(BaseModel):
    category: str
    subject: Optional[str] = None
    description: str


class GrievanceCommentCreate(BaseModel):
    comment: str


class GrievanceCommentOut(BaseModel):
    comment_id: int
    ticket_id: int
    user_id: str
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    comment: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GrievanceOut(BaseModel):
    ticket_id: int
    student_id: Optional[int] = None
    category: str
    subject: Optional[str] = None
    description: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assigned_department: Optional[str] = None
    is_urgent: bool = False
    priority: str = "Normal"
    resolution: Optional[str] = None
    satisfaction_rating: Optional[int] = None
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None
    comments: List[GrievanceCommentOut] = []

    class Config:
        from_attributes = True


class GrievanceStatusUpdate(BaseModel):
    status: str
    resolution: Optional[str] = None


# ---------------------------------------------------------------------------
# Content Announcements (MongoDB) — FYP Spec Table 140
# ---------------------------------------------------------------------------

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    course_id: Optional[int] = None
    target_audience: List[str] = ["all"]
    target_programs: Optional[List[int]] = None
    target_semesters: Optional[List[int]] = None
    priority: str = "medium"
    is_pinned: bool = False
    attachments: List[str] = []


class AnnouncementCommentCreate(BaseModel):
    comment: str


class AnnouncementCommentOut(BaseModel):
    comment_id: str
    user_id: str
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    comment: str
    created_at: str


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    course_id: Optional[int] = None
    target_audience: Optional[List[str]] = None
    target_programs: Optional[List[int]] = None
    target_semesters: Optional[List[int]] = None
    priority: Optional[str] = None
    is_pinned: Optional[bool] = None
    attachments: Optional[List[str]] = None
    expires_at: Optional[str] = None


class AnnouncementOut(BaseModel):
    id: str
    title: str
    content: str
    course_id: Optional[int] = None
    author_id: str
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    target_audience: List[str]
    target_programs: Optional[List[int]] = None
    target_semesters: Optional[List[int]] = None
    priority: str = "medium"
    published_at: str
    expires_at: Optional[str] = None
    is_pinned: bool = False
    attachments: List[str] = []
    view_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    comments: List[AnnouncementCommentOut] = []


# ---------------------------------------------------------------------------
# Audit Trails (MongoDB) — FYP Spec Table 136
# ---------------------------------------------------------------------------

class AuditTrailCreate(BaseModel):
    action: str
    target_entity: str
    entity_id: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    severity: str = "INFO"


class AuditTrailOut(BaseModel):
    id: str
    action: str
    user_id: str
    user_name: Optional[str] = None
    target_entity: str
    entity_id: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: str
    severity: str = "INFO"


# ---------------------------------------------------------------------------
# Media Assets (MongoDB) — FYP Spec Table 137
# ---------------------------------------------------------------------------

class MediaAssetCreate(BaseModel):
    s3_url: str
    s3_key: str
    file_type: str
    file_name: str
    size_bytes: int = 0
    entity_type: str = ""
    entity_id: str = ""
    is_public: bool = False


class MediaAssetOut(BaseModel):
    id: str
    uploader_id: str
    s3_url: str
    s3_key: str
    file_type: str
    file_name: str
    size_bytes: int
    upload_date: str
    entity_type: str
    entity_id: str
    is_public: bool = False
    scan_status: str = "pending"


# ---------------------------------------------------------------------------
# Notifications (MongoDB) — FYP Spec Table 138
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# System Logs (MongoDB) — FYP Spec Table 141
# ---------------------------------------------------------------------------

class SystemLogCreate(BaseModel):
    service_name: str
    level: str = "INFO"
    message: str
    stack_trace: Optional[str] = None
    context: Optional[Any] = None
    environment: str = "production"


class SystemLogOut(BaseModel):
    id: str
    service_name: str
    level: str
    message: str
    stack_trace: Optional[str] = None
    timestamp: str
    context: Optional[Any] = None
    environment: str


class MessageResponse(BaseModel):
    message: str
