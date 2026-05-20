import base64
from datetime import date, datetime, timedelta
from typing import List
import uuid as uuidlib

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, status
import requests
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.kafka_producer import publish_hr_notification
from app.models import (
    AuthUser,
    HrNotification,
    LmsAttendance,
    LmsCourse,
    OpsLeave,
    OpsLeaveDocument,
    SisEnrollment,
    SisFaculty,
    SisStudent,
)
from app.schemas import (
    EmployeeOut,
    EmployeeUpdate,
    LeaveActionRequest,
    LeaveApplyRequest,
    LeaveBalanceOut,
    LeaveOut,
    MessageResponse,
    NotificationOut,
)

router = APIRouter(prefix="/hr", tags=["HR"])

CASUAL_LEAVE_QUOTA = 20


def _get_fernet():
    key = settings.AES_SECRET_KEY
    if not key:
        return None
    # Pad or hash to 32 bytes then base64-encode for Fernet
    key_bytes = key.encode("utf-8")[:32].ljust(32, b"\0")
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def _encrypt_salary(salary: str) -> str:
    f = _get_fernet()
    if f:
        return f.encrypt(salary.encode()).decode()
    return salary


def _decrypt_salary(encrypted: str) -> str:
    f = _get_fernet()
    if f:
        try:
            return f.decrypt(encrypted.encode()).decode()
        except Exception:
            return encrypted
    return encrypted


def _leave_days(start_date: date, end_date: date) -> int:
    return (end_date - start_date).days + 1


def _get_casual_leave_used(db: Session, user_id, year: int) -> int:
    leaves = (
        db.query(OpsLeave)
        .filter(
            OpsLeave.user_id == user_id,
            OpsLeave.leave_type == "Casual",
            OpsLeave.status == "Approved",
        )
        .all()
    )
    total = 0
    for leave in leaves:
        if leave.start_date and leave.start_date.year == year:
            total += _leave_days(leave.start_date, leave.end_date)
    return total



def _coerce_uuid(value):
    if isinstance(value, uuidlib.UUID):
        return value
    try:
        return uuidlib.UUID(str(value))
    except Exception:
        return None


def _push_notification_service(user_id: str, title: str, message: str, notif_type: str = "info"):
    """
    Bridge to centralized notification service via Kafka events.
    Replaces synchronous HTTP calls with event-driven architecture.
    """
    publish_hr_notification(user_id, title, message, notif_type)


def _serialize_leave(db: Session, leave: OpsLeave) -> LeaveOut:
    docs = (
        db.query(OpsLeaveDocument)
        .filter(OpsLeaveDocument.leave_id == leave.leave_id)
        .order_by(OpsLeaveDocument.document_id.asc())
        .all()
    )
    return LeaveOut(
        leave_id=leave.leave_id,
        user_id=str(leave.user_id),
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        supporting_documents=[d.document_url for d in docs],
    )


def _notify_teachers_for_approved_student_leave(db: Session, leave: OpsLeave):
    user_uuid = _coerce_uuid(leave.user_id)
    if not user_uuid:
        return

    student = db.query(SisStudent).filter(SisStudent.user_id == user_uuid).first()
    if not student:
        return

    faculty_user_rows = (
        db.query(SisFaculty.user_id)
        .join(LmsCourse, LmsCourse.faculty_id == SisFaculty.faculty_id)
        .join(SisEnrollment, SisEnrollment.course_id == LmsCourse.course_id)
        .filter(
            SisEnrollment.student_id == student.student_id,
            SisEnrollment.status == "Enrolled",
        )
        .distinct()
        .all()
    )

    title = "Student Leave Approved"
    message = (
        f"Student {student.student_id} leave approved from "
        f"{leave.start_date.isoformat()} to {leave.end_date.isoformat()}."
    )

    for row in faculty_user_rows:
        faculty_user_id = row[0]
        if not faculty_user_id:
            continue
        db.add(
            HrNotification(
                user_id=faculty_user_id,
                title=title,
                message=message,
                is_read=False,
            )
        )
        _push_notification_service(str(faculty_user_id), title, message, "leave")


def _notify_hod_on_new_leave(db: Session, leave: OpsLeave):
    hod_rows = (
        db.query(SisFaculty.user_id)
        .filter(SisFaculty.designation.ilike("%hod%"))
        .distinct()
        .all()
    )
    title = "New Leave Application"
    message = (
        f"Leave request #{leave.leave_id} submitted from "
        f"{leave.start_date.isoformat()} to {leave.end_date.isoformat()}."
    )
    for row in hod_rows:
        hod_user_id = row[0]
        if not hod_user_id:
            continue
        db.add(
            HrNotification(
                user_id=hod_user_id,
                title=title,
                message=message,
                is_read=False,
            )
        )
        _push_notification_service(str(hod_user_id), title, message, "leave")


def _notify_leave_applicant(db: Session, leave: OpsLeave, decision: str, reason: str | None = None):
    user_uuid = _coerce_uuid(leave.user_id)
    if not user_uuid:
        return
    message = f"Your leave request #{leave.leave_id} has been {decision}."
    if reason:
        message = f"{message} Reason: {reason}"
    db.add(
        HrNotification(
            user_id=user_uuid,
            title=f"Leave {decision.title()}",
            message=message,
            is_read=False,
        )
    )
    _push_notification_service(str(user_uuid), f"Leave {decision.title()}", message, "leave")


def _mark_student_leave_attendance(db: Session, leave: OpsLeave):
    user_uuid = _coerce_uuid(leave.user_id)
    if not user_uuid:
        return

    student = db.query(SisStudent).filter(SisStudent.user_id == user_uuid).first()
    if not student:
        return

    course_ids = [
        row[0]
        for row in (
            db.query(SisEnrollment.course_id)
            .filter(
                SisEnrollment.student_id == student.student_id,
                SisEnrollment.status == "Enrolled",
            )
            .distinct()
            .all()
        )
    ]
    if not course_ids:
        return

    current_day = leave.start_date
    while current_day <= leave.end_date:
        for course_id in course_ids:
            existing = (
                db.query(LmsAttendance)
                .filter(
                    LmsAttendance.student_id == student.student_id,
                    LmsAttendance.course_id == course_id,
                    LmsAttendance.date == current_day,
                )
                .first()
            )
            if existing:
                existing.status = "Leave"
                existing.is_biometric_verified = False
            else:
                db.add(
                    LmsAttendance(
                        course_id=course_id,
                        student_id=student.student_id,
                        date=current_day,
                        status="Leave",
                        is_biometric_verified=False,
                    )
                )
        current_day += timedelta(days=1)


@router.post("/leaves/reset-quotas", response_model=MessageResponse)
def reset_all_leave_quotas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """
    Reset all faculty leave balances to default values.
    Should be triggered at the start of each academic year.
    """
    db.query(SisFaculty).update({
        SisFaculty.casual_leave_balance: 20,
        SisFaculty.sick_leave_balance: 10
    })
    db.commit()
    return MessageResponse(message="Successfully reset leave quotas for all faculty members.")


# ── Leave Management ─────────────────────────────────────────────────────

@router.post("/leaves/apply", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
def apply_leave(
    payload: LeaveApplyRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if payload.start_date > payload.end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

    requested_days = _leave_days(payload.start_date, payload.end_date)

    # Validate leave balance from database
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == current_user["user_id"]).first()
    if faculty:
        if payload.leave_type == "Casual":
            if requested_days > faculty.casual_leave_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient casual leave balance. Requested {requested_days}, remaining {faculty.casual_leave_balance}.",
                )
        elif payload.leave_type == "Sick":
            if requested_days > faculty.sick_leave_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient sick leave balance. Requested {requested_days}, remaining {faculty.sick_leave_balance}.",
                )

    leave = OpsLeave(
        user_id=current_user["user_id"],
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status="Pending",
    )
    db.add(leave)
    db.flush()

    for doc_url in payload.supporting_documents:
        if doc_url and doc_url.strip():
            db.add(
                OpsLeaveDocument(
                    leave_id=leave.leave_id,
                    document_url=doc_url.strip(),
                )
            )

    _notify_hod_on_new_leave(db, leave)

    db.commit()
    db.refresh(leave)
    return _serialize_leave(db, leave)


@router.get("/leaves/me")
def my_leaves(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    leaves = (
        db.query(OpsLeave)
        .filter(OpsLeave.user_id == current_user["user_id"])
        .order_by(OpsLeave.leave_id.desc())
        .all()
    )
    used = _get_casual_leave_used(db, current_user["user_id"], date.today().year)
    return {
        "leaves": [_serialize_leave(db, l) for l in leaves],
        "balance": LeaveBalanceOut(
            casual_leave_used=used,
            casual_leave_remaining=CASUAL_LEAVE_QUOTA - used,
        ),
    }


@router.get("/leaves/pending", response_model=List[LeaveOut])
def pending_leaves(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    leaves = (
        db.query(OpsLeave)
        .filter(OpsLeave.status == "Pending")
        .order_by(OpsLeave.leave_id.desc())
        .all()
    )
    return [_serialize_leave(db, leave) for leave in leaves]


@router.put("/leaves/{leave_id}/approve", response_model=LeaveOut)
def approve_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    leave = db.query(OpsLeave).filter(OpsLeave.leave_id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if leave.status != "Pending":
        raise HTTPException(status_code=400, detail="Leave is not in Pending state")
    leave.status = "Approved"

    _mark_student_leave_attendance(db, leave)
    _notify_teachers_for_approved_student_leave(db, leave)
    _notify_leave_applicant(db, leave, "approved")

    db.commit()
    db.refresh(leave)
    return _serialize_leave(db, leave)


@router.put("/leaves/{leave_id}/reject", response_model=LeaveOut)
def reject_leave(
    leave_id: int,
    payload: LeaveActionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    leave = db.query(OpsLeave).filter(OpsLeave.leave_id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if leave.status != "Pending":
        raise HTTPException(status_code=400, detail="Leave is not in Pending state")
    leave.status = "Rejected"
    rejection_reason = None
    if payload.reason:
        leave.reason = f"{leave.reason}\n[Rejection reason: {payload.reason}]"
        rejection_reason = payload.reason
    _notify_leave_applicant(db, leave, "rejected", rejection_reason)
    db.commit()
    db.refresh(leave)
    return _serialize_leave(db, leave)


@router.get("/notifications/me", response_model=List[NotificationOut])
def my_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_uuid = _coerce_uuid(current_user["user_id"])
    if not user_uuid:
        return []

    rows = (
        db.query(HrNotification)
        .filter(HrNotification.user_id == user_uuid)
        .order_by(HrNotification.notification_id.desc())
        .all()
    )
    return [
        NotificationOut(
            notification_id=row.notification_id,
            user_id=str(row.user_id),
            title=row.title,
            message=row.message,
            is_read=row.is_read,
            created_at=row.created_at.isoformat() if row.created_at else None,
        )
        for row in rows
    ]


@router.put("/notifications/{notification_id}/read", response_model=MessageResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_uuid = _coerce_uuid(current_user["user_id"])
    if not user_uuid:
        raise HTTPException(status_code=400, detail="Invalid user id")

    notification = (
        db.query(HrNotification)
        .filter(
            HrNotification.notification_id == notification_id,
            HrNotification.user_id == user_uuid,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return MessageResponse(message="Notification marked as read")


# ── Employee Profiles ─────────────────────────────────────────────────────

@router.get("/employees", response_model=List[EmployeeOut])
def list_employees(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    results = (
        db.query(SisFaculty, AuthUser.email)
        .join(AuthUser, SisFaculty.user_id == AuthUser.user_id)
        .all()
    )
    employees = []
    for faculty, email in results:
        employees.append(
            EmployeeOut(
                faculty_id=faculty.faculty_id,
                user_id=str(faculty.user_id),
                dept_id=faculty.dept_id,
                employee_code=faculty.employee_code,
                designation=faculty.designation,
                profile_image_id=faculty.profile_image_id,
                email=email,
            )
        )
    return employees


@router.get("/employees/{faculty_id}", response_model=EmployeeOut)
def get_employee(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = (
        db.query(SisFaculty, AuthUser.email)
        .join(AuthUser, SisFaculty.user_id == AuthUser.user_id)
        .filter(SisFaculty.faculty_id == faculty_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Employee not found")
    faculty, email = result
    return EmployeeOut(
        faculty_id=faculty.faculty_id,
        user_id=str(faculty.user_id),
        dept_id=faculty.dept_id,
        employee_code=faculty.employee_code,
        designation=faculty.designation,
        profile_image_id=faculty.profile_image_id,
        email=email,
    )


@router.put("/employees/{faculty_id}", response_model=MessageResponse)
def update_employee(
    faculty_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    faculty = db.query(SisFaculty).filter(SisFaculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Employee not found")

    if payload.designation is not None:
        faculty.designation = payload.designation
    if payload.dept_id is not None:
        faculty.dept_id = payload.dept_id
    if payload.salary_tier is not None:
        faculty.salary_tier_encrypted = _encrypt_salary(payload.salary_tier)

    db.commit()
    return MessageResponse(message="Employee updated successfully")
