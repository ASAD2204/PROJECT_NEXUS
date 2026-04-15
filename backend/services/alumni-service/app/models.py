from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Date,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import relationship
from sqlalchemy import Numeric

from app.database import Base


class SISStudent(Base):
    """Read-only mirror of the sis_students table managed by the SIS service."""

    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    roll_no = Column(String(20), nullable=False)

    # Relationship
    alumni = relationship("AlumniRegistry", back_populates="student", uselist=False)


class AlumniRegistry(Base):
    """Core alumni profile linked to a graduated student."""

    __tablename__ = "alumni_registry"

    alumni_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(
        Integer,
        ForeignKey("sis_students.student_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    grad_year = Column(Integer, nullable=False)
    degree = Column(String(100), nullable=True)
    current_employer = Column(String(100), nullable=True)
    current_position = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    photo_url = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    achievements = Column(Text, nullable=True)  # JSON array as text
    expertise = Column(Text, nullable=True)      # JSON array as text

    # Relationships
    student = relationship("SISStudent", back_populates="alumni")
    jobs = relationship(
        "AlumniJob", back_populates="alumni", cascade="all, delete-orphan"
    )
    mentorship = relationship(
        "AlumniMentorship", back_populates="alumni", cascade="all, delete-orphan", uselist=False
    )
    stories = relationship(
        "AlumniSuccessStory", back_populates="alumni", cascade="all, delete-orphan"
    )


class AlumniJob(Base):
    """Job posting created by an alumnus for the job board."""

    __tablename__ = "alumni_jobs"

    job_id = Column(Integer, primary_key=True, autoincrement=True)
    alumni_id = Column(
        Integer,
        ForeignKey("alumni_registry.alumni_id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(100), nullable=False)
    company = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    apply_link = Column(String(255), nullable=True)
    location = Column(String(100), nullable=True)
    job_type = Column(String(50), nullable=True)
    posted_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    is_active = Column(Boolean, default=True, server_default="true")
    status = Column(String(20), default="Pending", server_default="Pending")

    # Relationship
    alumni = relationship("AlumniRegistry", back_populates="jobs")


class AlumniEvent(Base):
    """Alumni events (reunions, workshops, etc.)."""

    __tablename__ = "alumni_events"

    event_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=True)
    venue = Column(String(200), nullable=True)
    event_type = Column(String(50), nullable=True)
    capacity = Column(Integer, nullable=True)
    registered_count = Column(Integer, default=0)
    fee = Column(Numeric(10, 2), default=0)
    organizer = Column(String(100), nullable=True)
    cover_image = Column(String(255), nullable=True)
    status = Column(String(20), default="Upcoming")
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    registrations = relationship("AlumniEventRegistration", back_populates="event", cascade="all, delete-orphan")


class AlumniEventRegistration(Base):
    """Registration for an alumni event."""

    __tablename__ = "alumni_event_registrations"
    __table_args__ = (UniqueConstraint("event_id", "alumni_id"),)

    registration_id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("alumni_events.event_id", ondelete="CASCADE"), nullable=False)
    alumni_id = Column(Integer, ForeignKey("alumni_registry.alumni_id", ondelete="CASCADE"), nullable=False)
    registered_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    event = relationship("AlumniEvent", back_populates="registrations")


class AlumniMentorship(Base):
    """Mentorship profiles for alumni mentors."""

    __tablename__ = "alumni_mentorship"

    mentorship_id = Column(Integer, primary_key=True, autoincrement=True)
    mentor_id = Column(Integer, ForeignKey("alumni_registry.alumni_id", ondelete="CASCADE"), nullable=False, unique=True)
    specialization = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    available_slots = Column(Integer, default=5)
    sessions_completed = Column(Integer, default=0)
    rating = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    alumni = relationship("AlumniRegistry", back_populates="mentorship")


class AlumniSuccessStory(Base):
    """Success stories posted by alumni."""

    __tablename__ = "alumni_success_stories"

    story_id = Column(Integer, primary_key=True, autoincrement=True)
    alumni_id = Column(Integer, ForeignKey("alumni_registry.alumni_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    cover_image = Column(String(255), nullable=True)
    likes_count = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    status = Column(String(20), default="Pending")
    published_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    alumni = relationship("AlumniRegistry", back_populates="stories")
