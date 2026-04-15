from datetime import datetime, date, time
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Alumni registration
# ---------------------------------------------------------------------------


class AlumniRegisterRequest(BaseModel):
    student_id: int
    grad_year: int
    degree: Optional[str] = None
    current_employer: Optional[str] = None
    current_position: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    achievements: Optional[str] = None  # JSON string
    expertise: Optional[str] = None     # JSON string


class AlumniUpdateRequest(BaseModel):
    degree: Optional[str] = None
    current_employer: Optional[str] = None
    current_position: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    achievements: Optional[str] = None
    expertise: Optional[str] = None


class AlumniOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alumni_id: int
    student_id: int
    grad_year: int
    degree: Optional[str] = None
    current_employer: Optional[str] = None
    current_position: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    achievements: Optional[str] = None
    expertise: Optional[str] = None


# ---------------------------------------------------------------------------
# Job board
# ---------------------------------------------------------------------------


class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    apply_link: str
    location: Optional[str] = None
    job_type: Optional[str] = None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: int
    alumni_id: int
    title: str
    company: str
    description: Optional[str] = None
    apply_link: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    posted_at: datetime
    is_active: bool
    status: str


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: date
    event_time: Optional[time] = None
    venue: Optional[str] = None
    event_type: Optional[str] = None
    capacity: Optional[int] = None
    fee: Optional[float] = 0
    organizer: Optional[str] = None
    cover_image: Optional[str] = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: int
    title: str
    description: Optional[str] = None
    event_date: date
    event_time: Optional[time] = None
    venue: Optional[str] = None
    event_type: Optional[str] = None
    capacity: Optional[int] = None
    registered_count: int = 0
    fee: Optional[float] = 0
    organizer: Optional[str] = None
    cover_image: Optional[str] = None
    status: str = "Upcoming"
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Mentorship
# ---------------------------------------------------------------------------


class MentorshipCreate(BaseModel):
    specialization: Optional[str] = None
    bio: Optional[str] = None
    available_slots: int = 5


class MentorshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mentorship_id: int
    mentor_id: int
    specialization: Optional[str] = None
    bio: Optional[str] = None
    available_slots: int = 5
    sessions_completed: int = 0
    rating: float = 0
    is_active: bool = True
    alumni: Optional[AlumniOut] = None


# ---------------------------------------------------------------------------
# Success Stories
# ---------------------------------------------------------------------------


class StoryCreate(BaseModel):
    title: str
    content: str
    cover_image: Optional[str] = None


class StoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    story_id: int
    alumni_id: int
    title: str
    content: str
    cover_image: Optional[str] = None
    likes_count: int = 0
    is_featured: bool = False
    status: str = "Pending"
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------


class MessageResponse(BaseModel):
    message: str
