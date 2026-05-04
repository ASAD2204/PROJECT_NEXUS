"""
Analytics service — read-only mirror models of tables managed by other services.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Date,
    Time,
    ForeignKey,
    Text,
    Numeric,
    TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# ---------------------------------------------------------------------------
# Auth — for resolving user names
# ---------------------------------------------------------------------------

class AuthUser(Base):
    __tablename__ = "auth_users"
    __table_args__ = {"extend_existing": True}

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255))
    is_active = Column(Boolean, default=True)


# ---------------------------------------------------------------------------
# SIS — Student Information System
# ---------------------------------------------------------------------------

class SisStudent(Base):
    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth_users.user_id"))
    program_id = Column(Integer)
    roll_no = Column(String(20))
    current_semester = Column(Integer)
    current_risk_status = Column(String(20), default="Green")

    user = relationship("AuthUser", foreign_keys=[user_id], lazy="joined")
    enrollments = relationship("SisEnrollment", back_populates="student")
    transcripts = relationship("SisTranscript", back_populates="student")
    invoices = relationship("FinInvoice", back_populates="student")


class SisFaculty(Base):
    __tablename__ = "sis_faculty"
    __table_args__ = {"extend_existing": True}

    faculty_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth_users.user_id"))
    dept_id = Column(Integer)
    employee_code = Column(String(20))
    designation = Column(String(50))

    user = relationship("AuthUser", foreign_keys=[user_id], lazy="joined")


class SisEnrollment(Base):
    __tablename__ = "sis_enrollments"
    __table_args__ = {"extend_existing": True}

    enrollment_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"))
    status = Column(String(20), default="Enrolled")
    final_grade_points = Column(Float, nullable=True)

    student = relationship("SisStudent", back_populates="enrollments")
    course = relationship("LmsCourse", back_populates="enrollments")


class SisTranscript(Base):
    __tablename__ = "sis_transcripts"
    __table_args__ = {"extend_existing": True}

    transcript_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    semester_id = Column(Integer)
    sgpa = Column(Float)
    cgpa = Column(Float)
    generated_at = Column(TIMESTAMP, server_default=func.now())

    student = relationship("SisStudent", back_populates="transcripts")


# ---------------------------------------------------------------------------
# LMS — Learning Management System
# ---------------------------------------------------------------------------

class LmsCourse(Base):
    __tablename__ = "lms_courses"
    __table_args__ = {"extend_existing": True}

    course_id = Column(Integer, primary_key=True)
    dept_id = Column(Integer)
    program_id = Column(Integer)
    semester_id = Column(Integer)
    faculty_id = Column(Integer, ForeignKey("sis_faculty.faculty_id"))
    code = Column(String(20))
    title = Column(String(100))
    credit_hours = Column(Integer)
    room_no = Column(String(20))
    capacity = Column(Integer)

    enrollments = relationship("SisEnrollment", back_populates="course")
    attendance_records = relationship("LmsAttendance", back_populates="course")
    assignments = relationship("LmsAssignment", back_populates="course")
    quizzes = relationship("LmsQuiz", back_populates="course")


class LmsAttendance(Base):
    __tablename__ = "lms_attendance"
    __table_args__ = {"extend_existing": True}

    attendance_id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"))
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    date = Column(Date)
    status = Column(String(10))  # 'Present', 'Absent', 'Leave', 'Late'
    check_in_time = Column(Time)
    is_biometric_verified = Column(Boolean, default=True)

    course = relationship("LmsCourse", back_populates="attendance_records")


class LmsAssignment(Base):
    __tablename__ = "lms_assignments"
    __table_args__ = {"extend_existing": True}

    assignment_id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"))
    title = Column(String(100))
    description = Column(Text, nullable=True)
    total_marks = Column(Integer)
    due_date = Column(TIMESTAMP)

    course = relationship("LmsCourse", back_populates="assignments")
    submissions = relationship("LmsSubmission", back_populates="assignment")


class LmsSubmission(Base):
    __tablename__ = "lms_submissions"
    __table_args__ = {"extend_existing": True}

    sub_id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("lms_assignments.assignment_id"))
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    submitted_at = Column(TIMESTAMP, server_default=func.now())
    marks_obtained = Column(Float, nullable=True)
    file_ref_id = Column(String(100))

    assignment = relationship("LmsAssignment", back_populates="submissions")


class LmsQuiz(Base):
    __tablename__ = "lms_quizzes"
    __table_args__ = {"extend_existing": True}

    quiz_id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"))
    title = Column(String(100))
    duration_minutes = Column(Integer)
    start_time = Column(TIMESTAMP)
    end_time = Column(TIMESTAMP)

    course = relationship("LmsCourse", back_populates="quizzes")
    answers = relationship("LmsAnswer", back_populates="quiz")


class LmsAnswer(Base):
    __tablename__ = "lms_answers"
    __table_args__ = {"extend_existing": True}

    answer_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    quiz_id = Column(Integer, ForeignKey("lms_quizzes.quiz_id"))
    question_id = Column(Integer)
    selected_option = Column(Text)
    score_obtained = Column(Float)

    quiz = relationship("LmsQuiz", back_populates="answers")


# ---------------------------------------------------------------------------
# Finance
# ---------------------------------------------------------------------------

class FinInvoice(Base):
    __tablename__ = "fin_invoices"
    __table_args__ = {"extend_existing": True}

    invoice_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    semester_id = Column(Integer)
    total_amount = Column(Numeric(10, 2))
    due_date = Column(Date)
    status = Column(String(20), default="Unpaid")

    student = relationship("SisStudent", back_populates="invoices")


class FinTransaction(Base):
    __tablename__ = "fin_transactions"
    __table_args__ = {"extend_existing": True}

    trx_id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("fin_invoices.invoice_id"))
    amount_paid = Column(Numeric(10, 2))
    trx_date = Column(TIMESTAMP, server_default=func.now())
