from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, Time,
    ForeignKey, CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Attendance(Base):
    __tablename__ = "lms_attendance"

    attendance_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(
        Integer,
        ForeignKey("lms_sections.section_id"),
        nullable=False,
    )
    student_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    status = Column(
        String(10),
        CheckConstraint("status IN ('Present', 'Absent', 'Leave', 'Late')"),
        nullable=False,
    )
    check_in_time = Column(Time, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_long = Column(Float, nullable=True)
    is_biometric_verified = Column(Boolean, default=True)


class Section(Base):
    """Read-only mirror of the LMS sections table."""
    __tablename__ = "lms_sections"
    __table_args__ = {"extend_existing": True}

    section_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, nullable=True)
    semester_id = Column(Integer, nullable=True)
    faculty_id = Column(Integer, nullable=True)
    room_no = Column(String(20), nullable=True)
    capacity = Column(Integer, nullable=True)


class Student(Base):
    """Read-only mirror of the SIS students table."""
    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    roll_no = Column(String, nullable=True)
