"""
SQLAlchemy ORM models for the SIS (Student Information System) service.

Defines core tables owned by this service (sis_*) and read-only mirror
tables from other services (lms_courses, fin_invoices) that are
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
from sqlalchemy.orm import relationship, backref

from app.database import Base


# --------------------------------------------------------------------------- #
#  Auth Mirror (for joins)
# --------------------------------------------------------------------------- #

class AuthUser(Base):
    __tablename__ = "auth_users"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_active = Column(Boolean, default=True)

    @property
    def full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip() or "N/A"

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


class SisDepartmentHead(Base):
    __tablename__ = "sis_department_heads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("sis_departments.dept_id"), unique=True, nullable=False)
    faculty_id = Column(Integer, ForeignKey("sis_faculty.faculty_id"), nullable=False)

    department = relationship("SisDepartment", backref=backref("head", uselist=False))
    faculty = relationship("SisFaculty")


class SisProgram(Base):
    __tablename__ = "sis_programs"

    program_id = Column(Integer, primary_key=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("sis_departments.dept_id"), nullable=False)
    title = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=True)
    degree_level = Column(String(20))
    total_semesters = Column(Integer)
    total_credits = Column(Integer, nullable=True)
    accreditation = Column(String(100), nullable=True)
    start_year = Column(Integer, nullable=True)
    status = Column(String(20), default="Active")
    tuition_fee = Column(Numeric(10, 2), nullable=True)

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
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth_users.user_id"), nullable=False)
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
    scholarship_percentage = Column(Float, default=0.0)

    # relationships
    user = relationship("AuthUser", backref=backref("student_profile", uselist=False))
    program = relationship("SisProgram", back_populates="students")
    enrollments = relationship("SisEnrollment", back_populates="student")
    transcripts = relationship("SisTranscript", back_populates="student")
    invoices = relationship("FinInvoice", back_populates="student")


class SisFaculty(Base):
    __tablename__ = "sis_faculty"

    faculty_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth_users.user_id"), nullable=False)
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
    user = relationship("AuthUser", backref=backref("faculty_profile", uselist=False))
    department = relationship("SisDepartment", back_populates="faculty")
    availability = relationship("SisFacultyAvailability", back_populates="faculty")


class SisFacultyAvailability(Base):
    __tablename__ = "sis_faculty_availability"

    avail_id = Column(Integer, primary_key=True, autoincrement=True)
    faculty_id = Column(Integer, ForeignKey("sis_faculty.faculty_id"), nullable=False)
    day_of_week = Column(String(10), nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True)  # True = can teach, False = blocked

    faculty = relationship("SisFaculty", back_populates="availability")


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
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"), nullable=False)
    status = Column(String(20), default="Enrolled")
    final_grade_points = Column(Float)

    # relationships
    student = relationship("SisStudent", back_populates="enrollments")
    course = relationship("LmsCourse", back_populates="enrollments")


# --------------------------------------------------------------------------- #
#  Cross-service read-only mirror tables
# --------------------------------------------------------------------------- #

class LmsCourse(Base):
    """Read-only mirror of lms_courses."""
    __tablename__ = "lms_courses"
    __table_args__ = {"extend_existing": True}

    course_id = Column(Integer, primary_key=True, autoincrement=True)
    dept_id = Column(Integer)
    program_id = Column(Integer)
    semester_id = Column(Integer)
    faculty_id = Column(Integer)
    code = Column(String(20))
    title = Column(String(100))
    credit_hours = Column(Integer)
    capacity = Column(Integer)
    room_no = Column(String(20))
    
    lectures_per_week = Column(Integer)
    lecture_duration_minutes = Column(Integer)

    # relationships
    enrollments = relationship("SisEnrollment", back_populates="course")
    timetable_slots = relationship("LmsTimetableSlot", back_populates="course")


class LmsTimetableSlot(Base):
    """Read-only mirror of lms_timetable_slots for conflict checks."""
    __tablename__ = "lms_timetable_slots"
    __table_args__ = {"extend_existing": True}

    slot_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"), nullable=False)
    day_of_week = Column(String(10), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    course = relationship("LmsCourse", back_populates="timetable_slots")


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
