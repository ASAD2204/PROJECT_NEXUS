from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class LeaveApplyRequest(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    supporting_documents: List[str] = []


class LeaveOut(BaseModel):
    leave_id: int
    user_id: str
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None
    status: str
    supporting_documents: List[str] = []

    class Config:
        from_attributes = True


class LeaveActionRequest(BaseModel):
    reason: Optional[str] = None


class EmployeeOut(BaseModel):
    faculty_id: int
    user_id: str
    dept_id: Optional[int] = None
    employee_code: str
    designation: Optional[str] = None
    profile_image_id: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeeUpdate(BaseModel):
    designation: Optional[str] = None
    dept_id: Optional[int] = None
    salary_tier: Optional[str] = None


class LeaveBalanceOut(BaseModel):
    casual_leave_total: int = 20
    casual_leave_used: int
    casual_leave_remaining: int


class MessageResponse(BaseModel):
    message: str


class NotificationOut(BaseModel):
    notification_id: int
    user_id: str
    title: str
    message: str
    is_read: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
