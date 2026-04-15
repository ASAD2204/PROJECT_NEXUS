from sqlalchemy import Column, Integer, String, Text, Date, TIMESTAMP, Boolean, ForeignKey, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class OpsLeave(Base):
    __tablename__ = "ops_leaves"

    leave_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True))
    leave_type = Column(String(50))
    start_date = Column(Date)
    end_date = Column(Date)
    reason = Column(Text)
    status = Column(String(20), default="Pending")

    documents = relationship("OpsLeaveDocument", back_populates="leave", cascade="all, delete-orphan")


class OpsLeaveDocument(Base):
    __tablename__ = "ops_leave_documents"

    document_id = Column(Integer, primary_key=True, autoincrement=True)
    leave_id = Column(Integer, ForeignKey("ops_leaves.leave_id", ondelete="CASCADE"), nullable=False)
    document_url = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    leave = relationship("OpsLeave", back_populates="documents")


class HrNotification(Base):
    __tablename__ = "hr_notifications"

    notification_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class SisFaculty(Base):
    __tablename__ = "sis_faculty"
    __table_args__ = {"extend_existing": True}

    faculty_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True))
    dept_id = Column(Integer)
    employee_code = Column(String(20), unique=True)
    designation = Column(String(50))
    salary_tier_encrypted = Column(Text, nullable=True)
    profile_image_id = Column(String(100), nullable=True)


class SisStudent(Base):
    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True))


class SisEnrollment(Base):
    __tablename__ = "sis_enrollments"
    __table_args__ = {"extend_existing": True}

    enrollment_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer)
    section_id = Column(Integer)
    status = Column(String(20), default="Enrolled")


class LmsSection(Base):
    __tablename__ = "lms_sections"
    __table_args__ = {"extend_existing": True}

    section_id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer)


class LmsAttendance(Base):
    __tablename__ = "lms_attendance"
    __table_args__ = {"extend_existing": True}

    attendance_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer)
    student_id = Column(Integer)
    date = Column(Date)
    status = Column(String(10))
    check_in_time = Column(Time)
    is_biometric_verified = Column(Boolean, default=False)


class AuthUser(Base):
    __tablename__ = "auth_users"
    __table_args__ = {"extend_existing": True}

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True)
    is_active = Column(Boolean, default=True)
