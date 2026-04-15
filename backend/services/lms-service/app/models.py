from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, Date, Time,
    ForeignKey, TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class LmsCourse(Base):
    __tablename__ = "lms_courses"

    course_id = Column(Integer, primary_key=True, autoincrement=True)
    dept_id = Column(Integer)
    code = Column(String(10), unique=True)
    title = Column(String(100))
    credit_hours = Column(Integer)
    description = Column(Text, nullable=True)
    cover_image = Column(String(255), nullable=True)

    sections = relationship("LmsSection", back_populates="course")


class LmsSection(Base):
    __tablename__ = "lms_sections"

    section_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"))
    semester_id = Column(Integer)
    faculty_id = Column(Integer)
    room_no = Column(String(20))
    capacity = Column(Integer)

    course = relationship("LmsCourse", back_populates="sections")
    assignments = relationship("LmsAssignment", back_populates="section")
    quizzes = relationship("LmsQuiz", back_populates="section")
    attendance_records = relationship("LmsAttendance", back_populates="section")
    timetable_slots = relationship("LmsTimetableSlot", back_populates="section")
    enrollments = relationship("SisEnrollment", back_populates="section")
    materials = relationship("LmsCourseMaterial", back_populates="section")


class LmsAssignment(Base):
    __tablename__ = "lms_assignments"

    assignment_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"))
    title = Column(String(100))
    description = Column(Text, nullable=True)
    total_marks = Column(Integer)
    due_date = Column(TIMESTAMP)
    attachment_ref_id = Column(String(100))

    section = relationship("LmsSection", back_populates="assignments")
    submissions = relationship("LmsSubmission", back_populates="assignment")


class LmsSubmission(Base):
    __tablename__ = "lms_submissions"

    sub_id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("lms_assignments.assignment_id"))
    student_id = Column(Integer)
    submitted_at = Column(TIMESTAMP, server_default=func.now())
    marks_obtained = Column(Float, nullable=True)
    file_ref_id = Column(String(100))

    assignment = relationship("LmsAssignment", back_populates="submissions")


class LmsQuiz(Base):
    __tablename__ = "lms_quizzes"

    quiz_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"))
    title = Column(String(100))
    duration_minutes = Column(Integer)
    start_time = Column(TIMESTAMP)
    end_time = Column(TIMESTAMP)

    section = relationship("LmsSection", back_populates="quizzes")
    questions = relationship("LmsQuestion", back_populates="quiz")
    answers = relationship("LmsAnswer", back_populates="quiz")


class LmsQuestion(Base):
    __tablename__ = "lms_questions"

    question_id = Column(Integer, primary_key=True, autoincrement=True)
    quiz_id = Column(Integer, ForeignKey("lms_quizzes.quiz_id"))
    text = Column(Text, nullable=False)
    question_type = Column(String(20))
    marks = Column(Float)
    correct_answer = Column(Text, nullable=True)

    quiz = relationship("LmsQuiz", back_populates="questions")


class LmsAnswer(Base):
    __tablename__ = "lms_answers"

    answer_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer)
    quiz_id = Column(Integer, ForeignKey("lms_quizzes.quiz_id"))
    question_id = Column(Integer, ForeignKey("lms_questions.question_id"))
    selected_option = Column(Text)
    score_obtained = Column(Float)

    quiz = relationship("LmsQuiz", back_populates="answers")
    question = relationship("LmsQuestion")


class LmsAttendance(Base):
    __tablename__ = "lms_attendance"

    attendance_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"))
    student_id = Column(Integer)
    date = Column(Date, nullable=False)
    status = Column(String(10))
    check_in_time = Column(Time)
    gps_lat = Column(Float)
    gps_long = Column(Float)
    is_biometric_verified = Column(Boolean, default=True)

    section = relationship("LmsSection", back_populates="attendance_records")


class LmsTimetableSlot(Base):
    __tablename__ = "lms_timetable_slots"

    slot_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"))
    day_of_week = Column(String(10))
    start_time = Column(Time)
    end_time = Column(Time)
    room_no = Column(String(20))

    section = relationship("LmsSection", back_populates="timetable_slots")


class SisEnrollment(Base):
    __tablename__ = "sis_enrollments"
    __table_args__ = {"extend_existing": True}

    enrollment_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"))
    status = Column(String(20), default="Enrolled")
    final_grade_points = Column(Float, nullable=True)

    section = relationship("LmsSection", back_populates="enrollments")


class LmsCourseMaterial(Base):
    __tablename__ = "lms_course_materials"

    material_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_ref_id = Column(String(255))
    material_type = Column(String(50), default="document")
    uploaded_by = Column(Integer)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())

    section = relationship("LmsSection", back_populates="materials")


class SisStudent(Base):
    """Read-only mirror of sis_students for resolving student_id from user_id."""
    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True))


class SisFaculty(Base):
    """Read-only mirror of sis_faculty for resolving faculty_id from user_id."""
    __tablename__ = "sis_faculty"
    __table_args__ = {"extend_existing": True}

    faculty_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True))
