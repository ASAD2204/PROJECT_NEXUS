from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# ── Fee Heads ─────────────────────────────────────────────────────────────

class FeeHeadCreate(BaseModel):
    title: str
    default_amount: float


class FeeHeadUpdate(BaseModel):
    title: Optional[str] = None
    default_amount: Optional[float] = None


class FeeHeadOut(BaseModel):
    head_id: int
    title: str
    default_amount: float

    class Config:
        from_attributes = True


# ── Invoices ──────────────────────────────────────────────────────────────

class InvoiceGenerateRequest(BaseModel):
    semester_id: int
    student_ids: List[int]
    due_date: date


class InvoiceItemOut(BaseModel):
    item_id: int
    head_id: int
    amount: float
    title: Optional[str] = None

    class Config:
        from_attributes = True


class InvoiceOut(BaseModel):
    invoice_id: int
    student_id: int
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None
    semester_id: Optional[int] = None
    total_amount: float
    due_date: Optional[date] = None
    status: str
    items: List[InvoiceItemOut] = []

    class Config:
        from_attributes = True


# ── Payments ──────────────────────────────────────────────────────────────

class PaymentInitiateRequest(BaseModel):
    invoice_id: int


class PaymentInitiateResponse(BaseModel):
    client_secret: str
    invoice_id: int


class PaymentReminderRequest(BaseModel):
    student_id: int | str
    amount: Optional[float] = None


class TransactionOut(BaseModel):
    trx_id: int
    invoice_id: int
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None
    gateway_ref: Optional[str] = None
    amount_paid: float
    trx_date: Optional[datetime] = None
    method: Optional[str] = None

    class Config:
        from_attributes = True


# ── Fines ─────────────────────────────────────────────────────────────────

class FineCreate(BaseModel):
    invoice_id: Optional[int] = None
    days_overdue: int
    fine_amount: float


class FineOut(BaseModel):
    fine_id: int
    invoice_id: int
    days_overdue: int
    fine_amount: float
    applied_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Generic ───────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


# ── Fee Structure ─────────────────────────────────────────────────────────

class FeeStructureCreate(BaseModel):
    dept_id: Optional[int] = None
    program_id: Optional[int] = None
    semester_id: Optional[int] = None
    head_id: int
    amount: float


class FeeStructureOut(BaseModel):
    struct_id: int
    dept_id: Optional[int] = None
    program_id: Optional[int] = None
    semester_id: Optional[int] = None
    head_id: int
    amount: float
    fee_head: Optional[FeeHeadOut] = None

    class Config:
        from_attributes = True
