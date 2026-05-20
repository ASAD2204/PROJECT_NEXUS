from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, Time,
    ForeignKey, CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class AuthUser(Base):
    __tablename__ = "auth_users"
    __table_args__ = {"extend_existing": True}

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)


class Attendance(Base):
    __tablename__ = "lms_attendance"

    attendance_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(
        Integer,
        ForeignKey("lms_courses.course_id"),
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


class Course(Base):
    """Read-only mirror of the LMS courses table."""
    __tablename__ = "lms_courses"
    __table_args__ = {"extend_existing": True}

    course_id = Column(Integer, primary_key=True, autoincrement=True)
    dept_id = Column(Integer, nullable=True)
    program_id = Column(Integer, nullable=True)
    semester_id = Column(Integer, nullable=True)
    faculty_id = Column(Integer, nullable=True)
    code = Column(String(20), nullable=True)
    title = Column(String(100), nullable=True)
    room_no = Column(String(20), nullable=True)
    capacity = Column(Integer, nullable=True)


class Student(Base):
    """Read-only mirror of the SIS students table."""
    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth_users.user_id"), nullable=True)
    roll_no = Column(String, nullable=True)


class SisEnrollment(Base):
    """Read-only mirror of the SIS enrollments table."""
    __tablename__ = "sis_enrollments"
    __table_args__ = {"extend_existing": True}

    enrollment_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"))
    status = Column(String(20), default="Enrolled")
