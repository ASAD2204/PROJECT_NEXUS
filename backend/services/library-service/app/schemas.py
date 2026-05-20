from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Book schemas
# ---------------------------------------------------------------------------

class BookCreate(BaseModel):
    isbn: str = Field(..., max_length=20, examples=["978-3-16-148410-0"])
    title: str = Field(..., max_length=300)
    author: str = Field(..., max_length=200)
    category: Optional[str] = Field(None, max_length=50)
    publisher: Optional[str] = Field(None, max_length=100)
    publication_year: Optional[int] = None
    pages: Optional[int] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = Field("English", max_length=30)
    total_copies: int = Field(1, ge=1)
    available_copies: Optional[int] = Field(None, ge=0)
    digital_link: Optional[str] = Field(None, max_length=500)
    shelf_location: Optional[str] = Field(None, max_length=50)


class BookUpdate(BaseModel):
    isbn: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=300)
    author: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=50)
    publisher: Optional[str] = Field(None, max_length=100)
    publication_year: Optional[int] = None
    pages: Optional[int] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = Field(None, max_length=30)
    total_copies: Optional[int] = Field(None, ge=1)
    available_copies: Optional[int] = Field(None, ge=0)
    digital_link: Optional[str] = Field(None, max_length=500)
    shelf_location: Optional[str] = Field(None, max_length=50)


class BookOut(BaseModel):
    book_id: int
    isbn: str
    title: str
    author: str
    category: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    pages: Optional[int] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    total_copies: int
    available_copies: int
    digital_link: Optional[str] = None
    shelf_location: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Issue schemas
# ---------------------------------------------------------------------------

class IssueCreate(BaseModel):
    student_id: Optional[int] = None
    user_id: Optional[UUID] = None
    book_id: int


class IssueOut(BaseModel):
    issue_id: int
    student_id: Optional[int] = None
    user_id: Optional[UUID] = None
    book_id: Optional[int] = None
    issue_date: date
    due_date: date
    return_date: Optional[date] = None
    status: str
    fine_amount: Optional[float] = 0.0
    days_overdue: Optional[int] = 0
    return_condition: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IssueDetailOut(IssueOut):
    """Issue with nested book details."""
    student_roll_no: Optional[str] = None
    student_name: Optional[str] = None
    book: Optional[BookOut] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Return / fine schemas
# ---------------------------------------------------------------------------

class ReturnOut(BaseModel):
    issue_id: int
    return_date: date
    days_overdue: int
    fine_amount: float
    fine_status: Optional[str] = None
    message: str


# ---------------------------------------------------------------------------
# QR code schema
# ---------------------------------------------------------------------------

class QRRequest(BaseModel):
    student_id: str


# ---------------------------------------------------------------------------
# Generic response
# ---------------------------------------------------------------------------

class MessageOut(BaseModel):
    detail: str


# ---------------------------------------------------------------------------
# Reservation schemas
# ---------------------------------------------------------------------------

class ReservationCreate(BaseModel):
    student_id: Optional[int] = None
    book_id: int


class ReservationOut(BaseModel):
    reservation_id: int
    student_id: Optional[int] = None
    user_id: Optional[UUID] = None
    book_id: Optional[int] = None
    reserved_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    status: str
    student_roll_no: Optional[str] = None
    student_name: Optional[str] = None
    book: Optional[BookOut] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Report schemas
# ---------------------------------------------------------------------------

class LibraryStatsOut(BaseModel):
    total_books: int
    total_issued: int
    total_overdue: int
    total_reservations: int
    books_by_category: dict = {}
    recent_transactions: list = []
    monthly_circulation: list = [] # [{"month": "Jan", "issued": 10, "returned": 8, "reserved": 2}, ...]


# ---------------------------------------------------------------------------
# Librarian profile schemas
# ---------------------------------------------------------------------------

class LibrarianProfileOut(BaseModel):
    librarian_profile_id: int
    user_id: UUID
    employee_code: Optional[str] = Field(None, alias="employeeId")
    shift: Optional[str] = None
    assigned_section: Optional[str] = Field(None, alias="assignedSection")
    joining_date: Optional[date] = Field(None, alias="joiningDate")
    experience: Optional[str] = None
    qualification: Optional[str] = None
    working_hours: Optional[str] = Field(None, alias="workingHours")
    emergency_contact: Optional[str] = Field(None, alias="emergencyContact")
    profile_image_id: Optional[str] = Field(None, alias="profileImageId")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class LibrarianProfileUpdate(BaseModel):
    employee_code: Optional[str] = Field(None, alias="employeeId")
    shift: Optional[str] = None
    assigned_section: Optional[str] = Field(None, alias="assignedSection")
    joining_date: Optional[date] = Field(None, alias="joiningDate")
    experience: Optional[str] = None
    qualification: Optional[str] = None
    working_hours: Optional[str] = Field(None, alias="workingHours")
    emergency_contact: Optional[str] = Field(None, alias="emergencyContact")
    profile_image_id: Optional[str] = Field(None, alias="profileImageId")

    class Config:
        populate_by_name = True
