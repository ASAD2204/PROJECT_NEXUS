from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, time


# ── Courses ───────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    dept_id: int
    code: str
    title: str
    credit_hours: int
    description: Optional[str] = None
    cover_image: Optional[str] = None


class CourseOut(BaseModel):
    course_id: int
    dept_id: Optional[int] = None
    code: str
    title: str
    credit_hours: int
    description: Optional[str] = None
    cover_image: Optional[str] = None

    class Config:
        from_attributes = True


# ── Sections ──────────────────────────────────────────────────────────────

class SectionCreate(BaseModel):
    course_id: int
    semester_id: int
    faculty_id: int
    room_no: Optional[str] = None
    capacity: Optional[int] = 40


class SectionOut(BaseModel):
    section_id: int
    course_id: int
    semester_id: Optional[int] = None
    faculty_id: Optional[int] = None
    room_no: Optional[str] = None
    capacity: Optional[int] = None
    course: Optional[CourseOut] = None

    class Config:
        from_attributes = True


# ── Assignments ───────────────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    section_id: int
    title: str
    description: Optional[str] = None
    total_marks: int = 100
    due_date: Optional[datetime] = None
    attachment_ref_id: Optional[str] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    total_marks: Optional[int] = None
    due_date: Optional[datetime] = None
    attachment_ref_id: Optional[str] = None


class AssignmentOut(BaseModel):
    assignment_id: int
    section_id: int
    title: str
    description: Optional[str] = None
    total_marks: int
    due_date: Optional[datetime] = None
    attachment_ref_id: Optional[str] = None

    class Config:
        from_attributes = True


# ── Submissions ───────────────────────────────────────────────────────────

class SubmissionCreate(BaseModel):
    assignment_id: int
    file_ref_id: Optional[str] = None


class SubmissionOut(BaseModel):
    sub_id: int
    assignment_id: int
    student_id: int
    submitted_at: Optional[datetime] = None
    marks_obtained: Optional[float] = None
    file_ref_id: Optional[str] = None

    class Config:
        from_attributes = True


class GradeSubmission(BaseModel):
    marks_obtained: float


# ── Quizzes ───────────────────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    text: str
    question_type: str = "MCQ"
    marks: float = 1.0
    correct_answer: Optional[str] = None


class QuizCreate(BaseModel):
    section_id: int
    title: str
    duration_minutes: int = 30
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    questions: List[QuestionCreate] = []


class QuestionOut(BaseModel):
    question_id: int
    quiz_id: int
    text: str
    question_type: str
    marks: float

    class Config:
        from_attributes = True


class QuizOut(BaseModel):
    quiz_id: int
    section_id: int
    title: str
    duration_minutes: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


class AnswerSubmit(BaseModel):
    question_id: int
    selected_option: str


class QuizAttempt(BaseModel):
    answers: List[AnswerSubmit]


# ── Attendance ────────────────────────────────────────────────────────────

class AttendanceOut(BaseModel):
    attendance_id: int
    section_id: int
    student_id: int
    date: date
    status: str
    check_in_time: Optional[time] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None
    is_biometric_verified: Optional[bool] = None

    class Config:
        from_attributes = True


# ── Timetable ─────────────────────────────────────────────────────────────

class TimetableSlotCreate(BaseModel):
    section_id: int
    day_of_week: str
    start_time: time
    end_time: time
    room_no: Optional[str] = None


class TimetableSlotOut(BaseModel):
    slot_id: int
    section_id: int
    day_of_week: str
    start_time: time
    end_time: time
    room_no: Optional[str] = None

    class Config:
        from_attributes = True


class TimetableConstraintCheckRequest(BaseModel):
    section_id: int
    day_of_week: str
    start_time: time
    end_time: time
    room_no: Optional[str] = None


class TimetableConstraintViolation(BaseModel):
    type: str
    message: str


class TimetableConstraintCheckOut(BaseModel):
    is_valid: bool
    violations: List[TimetableConstraintViolation] = []


class AutoScheduleRequest(BaseModel):
    section_ids: List[int]
    days_of_week: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    slot_minutes: int = 60
    start_hour: int = 8
    end_hour: int = 17
    default_room: Optional[str] = None


class AutoScheduledSlotOut(BaseModel):
    section_id: int
    day_of_week: str
    start_time: time
    end_time: time
    room_no: Optional[str] = None


class AutoScheduleOut(BaseModel):
    created: List[AutoScheduledSlotOut]
    unscheduled: List[str]


# ── Grades ────────────────────────────────────────────────────────────────

class StudentGrade(BaseModel):
    student_id: int
    grade_points: float


class GradeSubmitRequest(BaseModel):
    section_id: int
    grades: List[StudentGrade]
    final_submit: bool = False


# ── Course Materials ──────────────────────────────────────────────────────

class CourseMaterialCreate(BaseModel):
    course_id: Optional[int] = None
    section_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_ref_id: Optional[str] = None
    material_type: Optional[str] = "document"


class CourseMaterialOut(BaseModel):
    material_id: int
    section_id: int
    title: str
    description: Optional[str] = None
    file_ref_id: Optional[str] = None
    material_type: Optional[str] = None
    uploaded_by: Optional[int] = None
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Generic ───────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


# ── Feedback Surveys (MongoDB — FYP Table 142) ───────────────────────────

class FeedbackSurveyCreate(BaseModel):
    survey_type: str  # course_evaluation, faculty_feedback, facility_feedback
    course_id: Optional[int] = None
    section_id: Optional[int] = None
    faculty_id: Optional[int] = None
    responses: Optional[dict] = None
    overall_rating: float
    comments: Optional[str] = None
    is_anonymous: bool = False
    semester_id: Optional[int] = None


class FeedbackSurveyOut(BaseModel):
    id: str
    survey_type: str
    course_id: Optional[int] = None
    section_id: Optional[int] = None
    faculty_id: Optional[int] = None
    student_id: Optional[int] = None
    responses: Optional[dict] = None
    overall_rating: float
    comments: Optional[str] = None
    submitted_at: str
    is_anonymous: bool = False
    semester_id: Optional[int] = None


class FeedbackSummary(BaseModel):
    faculty_id: int
    total_reviews: int
    avg_rating: float
    semester_id: Optional[int] = None


# ── Feedback Surveys (MongoDB — FYP Spec Table 142) ──────────────────────

class FeedbackSurveyCreate(BaseModel):
    survey_type: str  # course_evaluation, faculty_feedback, facility_feedback
    course_id: Optional[int] = None
    section_id: Optional[int] = None
    faculty_id: Optional[int] = None
    responses: dict  # Flexible Q&A {q1: answer1, q2: answer2}
    overall_rating: float  # 1-5 scale
    comments: Optional[str] = None
    is_anonymous: bool = False
    semester_id: Optional[int] = None


class FeedbackSurveyOut(BaseModel):
    id: str
    survey_type: str
    course_id: Optional[int] = None
    section_id: Optional[int] = None
    faculty_id: Optional[int] = None
    student_id: Optional[int] = None
    responses: dict
    overall_rating: float
    comments: Optional[str] = None
    submitted_at: str
    is_anonymous: bool = False
    semester_id: Optional[int] = None


class FeedbackSummary(BaseModel):
    faculty_id: int
    total_reviews: int
    avg_rating: float
    semester_id: Optional[int] = None
