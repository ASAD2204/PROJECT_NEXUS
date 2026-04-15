from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Risk-related schemas
# ---------------------------------------------------------------------------

class StudentRiskFeatures(BaseModel):
    """Raw feature values used to compute a student's risk score."""
    attendance_pct: float = Field(..., ge=0, le=100, description="Attendance percentage")
    avg_quiz_score: float = Field(..., ge=0, le=100, description="Average quiz score as a percentage")
    assignment_submission_rate: float = Field(..., ge=0, le=100, description="Assignment submission rate as a percentage")
    cgpa: float = Field(..., ge=0.0, le=4.0, description="Cumulative GPA")


class StudentRiskResponse(BaseModel):
    student_id: int
    student_name: str
    risk_level: str  # Green, Yellow, Red
    features: StudentRiskFeatures

    class Config:
        from_attributes = True


class SectionAtRiskResponse(BaseModel):
    section_id: int
    course_name: Optional[str] = None
    total_students: int
    red_count: int
    yellow_count: int
    green_count: int
    students: List[StudentRiskResponse]


# ---------------------------------------------------------------------------
# Admin Dashboard schemas
# ---------------------------------------------------------------------------

class AttendanceKPI(BaseModel):
    total_records: int
    present_count: int
    attendance_pct: float


class RevenueKPI(BaseModel):
    total_invoiced: float
    total_collected: float
    collection_rate_pct: float
    outstanding: float


class AdminDashboardResponse(BaseModel):
    total_students: int
    active_students: int
    total_sections: int
    attendance: AttendanceKPI
    revenue: RevenueKPI
    at_risk_summary: dict  # {"red": int, "yellow": int, "green": int}
    avg_cgpa: float


# ---------------------------------------------------------------------------
# Faculty Dashboard schemas
# ---------------------------------------------------------------------------

class SectionPerformanceSummary(BaseModel):
    section_id: int
    course_name: Optional[str] = None
    enrolled_students: int
    avg_attendance_pct: float
    avg_quiz_score: float
    avg_assignment_score: float
    at_risk_count: int


class FacultyDashboardResponse(BaseModel):
    faculty_id: int
    total_sections: int
    total_students: int
    sections: List[SectionPerformanceSummary]


# ---------------------------------------------------------------------------
# Model training schemas
# ---------------------------------------------------------------------------

class TrainingDataRow(BaseModel):
    attendance_pct: float
    avg_quiz_score: float
    assignment_submission_rate: float
    cgpa: float
    label: str  # Red, Yellow, Green


class TrainModelRequest(BaseModel):
    training_data: List[TrainingDataRow]


class TrainModelResponse(BaseModel):
    status: str
    samples: int


# ---------------------------------------------------------------------------
# Generic message schema
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    detail: str


# ---------------------------------------------------------------------------
# Student Dashboard
# ---------------------------------------------------------------------------

class StudentDashboardResponse(BaseModel):
    student_id: int
    attendance_pct: float
    avg_quiz_score: float
    assignment_submission_rate: float
    cgpa: float
    risk_level: str
    total_courses: int
    completed_assignments: int
    pending_assignments: int


# ---------------------------------------------------------------------------
# Analytics Events (MongoDB — FYP Spec Table 139)
# ---------------------------------------------------------------------------

class AnalyticsEventCreate(BaseModel):
    event_type: str  # page_view, button_click, form_submit, search
    page_url: Optional[str] = None
    referrer_url: Optional[str] = None
    properties: Optional[dict] = None
    device_info: Optional[dict] = None
    geo_location: Optional[dict] = None


class AnalyticsEventOut(BaseModel):
    id: str
    event_type: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    page_url: Optional[str] = None
    referrer_url: Optional[str] = None
    timestamp: str
    properties: Optional[dict] = None
    device_info: Optional[dict] = None
    geo_location: Optional[dict] = None


class EventCountSummary(BaseModel):
    event_type: str
    count: int
