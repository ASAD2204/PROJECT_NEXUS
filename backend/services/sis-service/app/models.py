"""
SQLAlchemy ORM models for the SIS (Student Information System) service.

Defines core tables owned by this service (sis_*) and read-only mirror
tables from other services (lms_sections, fin_invoices) that are
referenced for cross-service queries.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    Date,
    Time,
    TIMESTAMP,
    Numeric,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# --------------------------------------------------------------------------- #
#  Core SIS tables
# --------------------------------------------------------------------------- #

class SisDepartment(Base):
    __tablename__ = "sis_departments"

    dept_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    location = Column(String(100))

    # relationships
    programs = relationship("SisProgram", back_populates="department")
    faculty = relationship("SisFaculty", back_populates="department")


class SisProgram(Base):
    __tablename__ = "sis_programs"

    program_id = Column(Integer, primary_key=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("sis_departments.dept_id"), nullable=False)
    title = Column(String(100), nullable=False)
    degree_level = Column(String(20))
    total_semesters = Column(Integer)

    # relationships
    department = relationship("SisDepartment", back_populates="programs")
    students = relationship("SisStudent", back_populates="program")


class SisSemester(Base):
    __tablename__ = "sis_semesters"

    semester_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(50), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=False)

    # relationships
    transcripts = relationship("SisTranscript", back_populates="semester")


class SisStudent(Base):
    __tablename__ = "sis_students"

    student_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    program_id = Column(Integer, ForeignKey("sis_programs.program_id"))
    roll_no = Column(String(20), unique=True, nullable=False)
    cnic = Column(String(15), unique=True)
    dob = Column(Date)
    address = Column(Text)
    phone = Column(String(20))
    blood_group = Column(String(5))
    guardian_name = Column(String(100))
    guardian_phone = Column(String(20))
    current_semester = Column(Integer)
    current_risk_status = Column(String(20), default="Green")
    profile_image_id = Column(String(100))

    # relationships
    program = relationship("SisProgram", back_populates="students")
    enrollments = relationship("SisEnrollment", back_populates="student")
    transcripts = relationship("SisTranscript", back_populates="student")
    invoices = relationship("FinInvoice", back_populates="student")


class SisFaculty(Base):
    __tablename__ = "sis_faculty"

    faculty_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    dept_id = Column(Integer, ForeignKey("sis_departments.dept_id"))
    employee_code = Column(String(20), unique=True, nullable=False)
    designation = Column(String(50))
    phone = Column(String(20))
    specialization = Column(String(100))
    office_location = Column(String(100))
    employment_status = Column(String(30))
    joining_date = Column(Date)
    qualification = Column(String(150))
    experience = Column(String(100))
    research_interests = Column(Text)
    publications = Column(Text)
    personal_email = Column(String(255))
    linkedin_url = Column(String(255))
    office_hours = Column(String(100))
    salary_tier_encrypted = Column(Text)
    profile_image_id = Column(String(100))

    # relationships
    department = relationship("SisDepartment", back_populates="faculty")


class SisTranscript(Base):
    __tablename__ = "sis_transcripts"

    transcript_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("sis_semesters.semester_id"), nullable=False)
    sgpa = Column(Float)
    cgpa = Column(Float)
    generated_at = Column(TIMESTAMP, server_default=func.now())

    # relationships
    student = relationship("SisStudent", back_populates="transcripts")
    semester = relationship("SisSemester", back_populates="transcripts")


class SisEnrollment(Base):
    __tablename__ = "sis_enrollments"

    enrollment_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"), nullable=False)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"), nullable=False)
    status = Column(String(20), default="Enrolled")
    final_grade_points = Column(Float)

    # relationships
    student = relationship("SisStudent", back_populates="enrollments")
    section = relationship("LmsSection", back_populates="enrollments")


# --------------------------------------------------------------------------- #
#  Cross-service read-only mirror tables
# --------------------------------------------------------------------------- #

class LmsSection(Base):
    """Read-only mirror of the LMS sections table."""
    __tablename__ = "lms_sections"
    __table_args__ = {"extend_existing": True}

    section_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer)
    semester_id = Column(Integer)
    faculty_id = Column(Integer)
    room_no = Column(String(20))
    capacity = Column(Integer)
    course = relationship("LmsCourse", back_populates="sections")

    # relationships
    enrollments = relationship("SisEnrollment", back_populates="section")
    timetable_slots = relationship("LmsTimetableSlot", back_populates="section")


class LmsCourse(Base):
    """Read-only mirror of lms_courses for credit-hour checks."""
    __tablename__ = "lms_courses"
    __table_args__ = {"extend_existing": True}

    course_id = Column(Integer, primary_key=True, autoincrement=True)
    credit_hours = Column(Integer)

    sections = relationship("LmsSection", back_populates="course")


class LmsTimetableSlot(Base):
    """Read-only mirror of lms_timetable_slots for conflict checks."""
    __tablename__ = "lms_timetable_slots"
    __table_args__ = {"extend_existing": True}

    slot_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"), nullable=False)
    day_of_week = Column(String(10), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    section = relationship("LmsSection", back_populates="timetable_slots")


class FinInvoice(Base):
    """Read-only mirror of the Finance invoices table (used for transcript blocking)."""
    __tablename__ = "fin_invoices"
    __table_args__ = {"extend_existing": True}

    invoice_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"), nullable=False)
    semester_id = Column(Integer)
    total_amount = Column(Numeric(10, 2))
    due_date = Column(Date)
    status = Column(String(20))

    # relationships
    student = relationship("SisStudent", back_populates="invoices")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
