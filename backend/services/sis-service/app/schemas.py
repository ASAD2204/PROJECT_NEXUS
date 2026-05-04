"""
Pydantic schemas for request/response validation in the SIS service.
"""

from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel


# --------------------------------------------------------------------------- #
#  Students
# --------------------------------------------------------------------------- #

class StudentOut(BaseModel):
    student_id: int
    user_id: UUID
    roll_no: str
    cnic: Optional[str] = None
    dob: Optional[date] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    current_semester: Optional[int] = None
    current_risk_status: Optional[str] = None
    program_id: Optional[int] = None
    scholarship_percentage: Optional[float] = 0.0
    profile_image_id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    cnic: Optional[str] = None
    dob: Optional[date] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    current_semester: Optional[int] = None
    scholarship_percentage: Optional[float] = None


# --------------------------------------------------------------------------- #
#  Enrollments
# --------------------------------------------------------------------------- #

class EnrollmentCreate(BaseModel):
    student_id: int
    course_id: int
    hod_approved: bool = False


class EnrollmentOut(BaseModel):
    enrollment_id: int
    student_id: int
    course_id: int
    status: Optional[str] = None
    final_grade_points: Optional[float] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Transcripts
# --------------------------------------------------------------------------- #

class TranscriptOut(BaseModel):
    transcript_id: int
    student_id: int
    semester_id: int
    sgpa: Optional[float] = None
    cgpa: Optional[float] = None
    generated_at: Optional[datetime] = None
    semester_title: Optional[str] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Semesters
# --------------------------------------------------------------------------- #

class SemesterOut(BaseModel):
    semester_id: int
    title: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Departments
# --------------------------------------------------------------------------- #

class DepartmentOut(BaseModel):
    dept_id: int
    name: str
    code: str
    location: Optional[str] = None
    students: Optional[int] = 0
    faculty: Optional[int] = 0
    courses: Optional[int] = 0
    growth: Optional[int] = 0

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str
    code: str
    location: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    location: Optional[str] = None


# --------------------------------------------------------------------------- #
#  Programs
# --------------------------------------------------------------------------- #

class ProgramOut(BaseModel):
    program_id: int
    dept_id: int
    title: str
    code: Optional[str] = None
    degree_level: Optional[str] = None
    total_semesters: Optional[int] = None
    total_credits: Optional[int] = None
    accreditation: Optional[str] = None
    start_year: Optional[int] = None
    status: Optional[str] = "Active"
    tuition_fee: Optional[float] = None
    student_count: Optional[int] = 0
    faculty_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ProgramCreate(BaseModel):
    dept_id: int
    title: str
    code: Optional[str] = None
    degree_level: Optional[str] = None
    total_semesters: Optional[int] = None
    total_credits: Optional[int] = None
    accreditation: Optional[str] = None
    start_year: Optional[int] = None
    status: Optional[str] = "Active"
    tuition_fee: Optional[float] = None


class ProgramUpdate(BaseModel):
    dept_id: Optional[int] = None
    title: Optional[str] = None
    code: Optional[str] = None
    degree_level: Optional[str] = None
    total_semesters: Optional[int] = None
    total_credits: Optional[int] = None
    accreditation: Optional[str] = None
    start_year: Optional[int] = None
    status: Optional[str] = None
    tuition_fee: Optional[float] = None


# --------------------------------------------------------------------------- #
#  Faculty
# --------------------------------------------------------------------------- #

class FacultyOut(BaseModel):
    faculty_id: int
    user_id: UUID
    dept_id: Optional[int] = None
    employee_code: str
    designation: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    employment_status: Optional[str] = None
    joining_date: Optional[date] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    research_interests: Optional[str] = None
    publications: Optional[str] = None
    personal_email: Optional[str] = None
    linkedin_url: Optional[str] = None
    office_hours: Optional[str] = None
    profile_image_id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class FacultyCreate(BaseModel):
    user_id: UUID
    dept_id: int
    employee_code: str
    designation: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    employment_status: Optional[str] = None
    joining_date: Optional[date] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    research_interests: Optional[str] = None
    publications: Optional[str] = None
    personal_email: Optional[str] = None
    linkedin_url: Optional[str] = None
    office_hours: Optional[str] = None
    profile_image_id: Optional[str] = None


class FacultyUpdate(BaseModel):
    dept_id: Optional[int] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    employment_status: Optional[str] = None
    joining_date: Optional[date] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    research_interests: Optional[str] = None
    publications: Optional[str] = None
    personal_email: Optional[str] = None
    linkedin_url: Optional[str] = None
    office_hours: Optional[str] = None
    profile_image_id: Optional[str] = None


class FacultyAvailabilityCreate(BaseModel):
    day_of_week: str
    start_time: str # "HH:MM"
    end_time: str # "HH:MM"
    is_available: bool = True

class FacultyAvailabilityOut(BaseModel):
    avail_id: int
    faculty_id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Generic
# --------------------------------------------------------------------------- #

class MessageResponse(BaseModel):
    message: str


class NotificationOut(BaseModel):
    notification_id: int
    user_id: UUID
    title: str
    message: Optional[str] = None
    type: Optional[str] = None
    is_read: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Transfer Import Payloads
# --------------------------------------------------------------------------- #

class TransferCourseItem(BaseModel):
    course_code: Optional[str] = None
    course_id: Optional[int] = None
    semester_id: int
    final_grade_points: Optional[float] = None
    credit_hours: Optional[int] = None


class TransferImport(BaseModel):
    student_id: int
    academic_history: List[TransferCourseItem]
