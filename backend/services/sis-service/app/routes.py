"""
API route definitions for the SIS service.

All endpoints are mounted under /api/v1/sis by the main application.
"""

import io
import json
import hashlib
import time
import base64
from datetime import datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from sqlalchemy import text, func as sa_func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db, redis_client
from app.dependencies import get_current_user, require_role
from app.models import (
    AuthUser,
    SisStudent,
    SisFaculty,
    SisFacultyAvailability,
    SisDepartment,
    SisProgram,
    SisSemester,
    SisTranscript,
    SisEnrollment,
    LmsCourse,
    LmsTimetableSlot,
    FinInvoice,
    Notification,
)
from app.schemas import (
    StudentOut,
    StudentUpdate,
    EnrollmentCreate,
    EnrollmentOut,
    TranscriptOut,
    SemesterOut,
    DepartmentOut,
    DepartmentCreate,
    DepartmentUpdate,
    ProgramOut,
    ProgramCreate,
    ProgramUpdate,
    FacultyOut,
    FacultyCreate,
    FacultyUpdate,
    FacultyAvailabilityCreate,
    FacultyAvailabilityOut,
    MessageResponse,
    NotificationOut,
    TransferImport,
)

import httpx
from app.config import settings

# Internal Auth Service URL for bulk identity resolution
AUTH_SERVICE_URL = "http://auth-service:8000"

async def _resolve_identities(user_ids: List[str]) -> dict:
    """
    Calls the Auth service bulk lookup to resolve user_ids into names/emails.
    """
    if not user_ids:
        return {}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{AUTH_SERVICE_URL}/api/v1/auth/users/bulk",
                json=user_ids,
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                # Handle both list and dict-wrapped-list response formats
                users_list = data.get("users") if isinstance(data, dict) and "users" in data else data
                return {u["user_id"]: u for u in (users_list if isinstance(users_list, list) else [])}
    except Exception as e:
        print(f"Identity resolution failed in SIS: {e}")
    return {}

router = APIRouter(prefix="/sis", tags=["SIS"])

def _promote_student_to_alumni_if_graduated(student: SisStudent, db: Session) -> None:
    """
    Auto-promote a student account to alumni once the final semester is reached.
    This updates auth role mapping and ensures an alumni registry row exists.
    """
    if not student or not student.program:
        return

    total_semesters = student.program.total_semesters or 0
    current_semester = student.current_semester or 0
    if total_semesters <= 0 or current_semester < total_semesters:
        return

    user_id = str(student.user_id)

    role_row = db.execute(
        text(
            """
            SELECT ar.role_name
            FROM auth_user_roles aur
            JOIN auth_roles ar ON ar.role_id = aur.role_id
            WHERE aur.user_id = CAST(:user_id AS uuid)
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).first()
    current_role = (role_row[0] if role_row else "").lower()

    alumni_role_row = db.execute(
        text("SELECT role_id FROM auth_roles WHERE role_name = 'alumni' LIMIT 1")
    ).first()
    if not alumni_role_row:
        return
    alumni_role_id = alumni_role_row[0]

    if current_role != "alumni":
        db.execute(
            text("DELETE FROM auth_user_roles WHERE user_id = CAST(:user_id AS uuid)"),
            {"user_id": user_id},
        )
        db.execute(
            text(
                """
                INSERT INTO auth_user_roles (user_id, role_id)
                VALUES (CAST(:user_id AS uuid), :role_id)
                """
            ),
            {"user_id": user_id, "role_id": alumni_role_id},
        )

    alumni_exists = db.execute(
        text(
            """
            SELECT alumni_id
            FROM alumni_registry
            WHERE student_id = :student_id
            LIMIT 1
            """
        ),
        {"student_id": student.student_id},
    ).first()

    if not alumni_exists:
        db.execute(
            text(
                """
                INSERT INTO alumni_registry (student_id, grad_year, degree)
                VALUES (:student_id, :grad_year, :degree)
                """
            ),
            {
                "student_id": student.student_id,
                "grad_year": datetime.utcnow().year,
                "degree": student.program.title if student.program else None,
            },
        )

    db.execute(
        text(
            """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (
                CAST(:user_id AS uuid),
                :title,
                :message,
                'academic',
                FALSE
            )
            """
        ),
        {
            "user_id": user_id,
            "title": "Congratulations! You are now an alumni",
            "message": "Your account has been moved to alumni after graduation.",
        },
    )


# ========================================================================== #
#  STUDENTS                                                                   #
# ========================================================================== #

@router.get("/students/me", response_model=StudentOut)
def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated student's own profile."""
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for the current user",
        )
    return student


@router.put("/students/me", response_model=StudentOut)
def update_my_profile(
    payload: StudentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated student's own profile."""
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for the current user",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    _promote_student_to_alumni_if_graduated(student, db)
    db.commit()
    db.refresh(student)
    return student


@router.get(
    "/students",
    response_model=List[StudentOut],
    dependencies=[Depends(require_role("admin", "faculty", "librarian"))],
)
def list_students(
    program_id: Optional[int] = Query(None),
    semester_id: Optional[int] = Query(None),
    current_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    """List all student records (admin only)."""
    try:
        query = db.query(SisStudent).options(joinedload(SisStudent.user))
        if program_id is not None:
            query = query.filter(SisStudent.program_id == program_id)
        if semester_id is not None:
            query = query.filter(SisStudent.current_semester == semester_id)
        if current_only:
            query = query.filter(SisStudent.current_semester.isnot(None), SisStudent.current_semester > 0)
        
        students = query.all()
        for s in students:
            _populate_user_details(s)
        return students
    except Exception as e:
        print(f"ERROR in list_students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single student by ID."""
    student = db.query(SisStudent).options(joinedload(SisStudent.user)).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return _populate_user_details(student)


@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Update a student's profile fields (cnic, dob, address)."""
    student = db.query(SisStudent).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    _promote_student_to_alumni_if_graduated(student, db)
    db.commit()
    db.refresh(student)
    return student


@router.post(
    "/students/{student_id}/import-history",
    response_model=MessageResponse,
    dependencies=[Depends(require_role("admin"))],
)
def import_transfer_history(
    student_id: int,
    payload: TransferImport,
    db: Session = Depends(get_db),
):
    """Import a transfer student's academic history (course-level rows).

    Payload should contain `academic_history` items with `course_code` or
    `course_id`, `semester_id`, and `final_grade_points` where available.
    The endpoint creates/updates `sis_enrollments` rows and upserts
    `sis_transcripts` (SGPA/CGPA) using the same averaging logic used by
    the consumer.
    """
    student = db.query(SisStudent).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    warnings = []
    # Insert or update enrollments
    for item in payload.academic_history:
        course_id = item.course_id
        if not course_id and item.course_code:
            course = db.query(LmsCourse).filter(LmsCourse.code == item.course_code).first()
            if course:
                course_id = course.course_id

        if not course_id:
            warnings.append(f"Skipped row - course not found: {getattr(item, 'course_code', None)}")
            continue

        existing = (
            db.query(SisEnrollment)
            .filter(
                SisEnrollment.student_id == student_id,
                SisEnrollment.course_id == course_id,
            )
            .first()
        )

        if existing:
            # update final grade if provided
            if item.final_grade_points is not None:
                existing.final_grade_points = item.final_grade_points
            existing.status = "Completed" if item.final_grade_points is not None else existing.status
        else:
            new_en = SisEnrollment(
                student_id=student_id,
                course_id=course_id,
                status=("Completed" if item.final_grade_points is not None else "Enrolled"),
                final_grade_points=item.final_grade_points,
            )
            db.add(new_en)

    db.commit()

    # Recalculate transcripts for semesters present in the payload
    semester_ids = sorted({it.semester_id for it in payload.academic_history if getattr(it, 'semester_id', None)})
    for sem in semester_ids:
        semester_grades = (
            db.query(SisEnrollment.final_grade_points)
            .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
            .filter(
                SisEnrollment.student_id == student_id,
                LmsCourse.semester_id == sem,
                SisEnrollment.final_grade_points.isnot(None),
                SisEnrollment.status != "Withdrawn",
            )
            .all()
        )

        if not semester_grades:
            continue

        sgpa = round(sum(g.final_grade_points for g in semester_grades) / len(semester_grades), 2)

        previous_transcripts = (
            db.query(SisTranscript)
            .filter(SisTranscript.student_id == student_id, SisTranscript.semester_id != sem)
            .all()
        )
        all_sgpas = [t.sgpa for t in previous_transcripts if t.sgpa is not None]
        all_sgpas.append(sgpa)
        cgpa = round(sum(all_sgpas) / len(all_sgpas), 2)

        transcript = (
            db.query(SisTranscript)
            .filter(SisTranscript.student_id == student_id, SisTranscript.semester_id == sem)
            .first()
        )

        if transcript:
            transcript.sgpa = sgpa
            transcript.cgpa = cgpa
            transcript.generated_at = sa_func.now()
        else:
            db.add(SisTranscript(student_id=student_id, semester_id=sem, sgpa=sgpa, cgpa=cgpa))

        for t in previous_transcripts:
            t.cgpa = cgpa

    db.commit()

    message = f"Imported history for student {student_id}. {len(semester_ids)} semester(s) updated."
    if warnings:
        message += " Warnings: " + "; ".join(warnings)
    return {"message": message}


# @router.post endpoint for promoting a student to the next semester
@router.post(
    "/students/{student_id}/promote",
    response_model=StudentOut,
    dependencies=[Depends(require_role("admin"))],
)
def promote_student(
    student_id: int,
    db: Session = Depends(get_db),
):
    """Advance a student to the next semester and recompute CGPA for reporting.

    This endpoint increments `current_semester` and updates existing
    transcripts' `cgpa` to reflect any changes. It will also call the
    alumni promotion helper if the student has reached program end.
    """
    student = db.query(SisStudent).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    student.current_semester = (student.current_semester or 0) + 1
    _promote_student_to_alumni_if_graduated(student, db)
    db.commit()
    db.refresh(student)

    # Recompute CGPA across transcripts (simple average of SGPA values)
    transcripts = db.query(SisTranscript).filter(SisTranscript.student_id == student_id).all()
    sgpas = [t.sgpa for t in transcripts if t.sgpa is not None]
    if sgpas:
        cgpa = round(sum(sgpas) / len(sgpas), 2)
        for t in transcripts:
            t.cgpa = cgpa
        db.commit()

    return student


# ========================================================================== #
#  ENROLLMENTS                                                                #
# ========================================================================== #

@router.post("/enrollments", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    payload: EnrollmentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a student for a course."""
    def _slots_conflict(start_a, end_a, start_b, end_b) -> bool:
        return start_a < end_b and start_b < end_a

    # Verify the student exists
    student = (
        db.query(SisStudent)
        .filter(SisStudent.student_id == payload.student_id)
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    course = (
        db.query(LmsCourse)
        .filter(LmsCourse.course_id == payload.course_id)
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # Check for duplicate active enrollment in the same COURSE
    existing_enrollment = (
        db.query(SisEnrollment)
        .filter(
            SisEnrollment.student_id == payload.student_id,
            SisEnrollment.course_id == payload.course_id,
            SisEnrollment.status == "Enrolled",
        )
        .first()
    )
    if existing_enrollment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already enrolled in this course",
        )

    # Course capacity check
    if course.capacity:
        enrolled_count = (
            db.query(SisEnrollment)
            .filter(
                SisEnrollment.course_id == payload.course_id,
                SisEnrollment.status == "Enrolled",
            )
            .count()
        )
        if enrolled_count >= course.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course is full",
            )

    # Timetable conflict check with currently enrolled courses
    enrolled_course_ids = [
        r.course_id
        for r in db.query(SisEnrollment)
        .filter(
            SisEnrollment.student_id == payload.student_id,
            SisEnrollment.status == "Enrolled",
        )
        .all()
    ]
    if enrolled_course_ids:
        candidate_slots = (
            db.query(LmsTimetableSlot)
            .filter(LmsTimetableSlot.course_id == payload.course_id)
            .all()
        )
        current_slots = (
            db.query(LmsTimetableSlot)
            .filter(LmsTimetableSlot.course_id.in_(enrolled_course_ids))
            .all()
        )
        for cand in candidate_slots:
            for cur in current_slots:
                if (
                    cand.day_of_week == cur.day_of_week
                    and _slots_conflict(
                        cand.start_time,
                        cand.end_time,
                        cur.start_time,
                        cur.end_time,
                    )
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Timetable conflict with an already enrolled course",
                    )

    # Credit-hour cap: default 18
    current_credits = (
        db.query(LmsCourse.credit_hours)
        .join(SisEnrollment, SisEnrollment.course_id == LmsCourse.course_id)
        .filter(
            SisEnrollment.student_id == payload.student_id,
            SisEnrollment.status == "Enrolled",
        )
        .all()
    )
    total_current_credits = sum((c[0] or 0) for c in current_credits)
    new_course_credits = course.credit_hours or 0
    prospective_total = total_current_credits + new_course_credits
    if prospective_total > 18:
        latest_transcript = (
            db.query(SisTranscript)
            .filter(SisTranscript.student_id == payload.student_id)
            .order_by(SisTranscript.generated_at.desc())
            .first()
        )
        latest_cgpa = float(latest_transcript.cgpa) if latest_transcript and latest_transcript.cgpa is not None else 0.0
        approver_role = current_user.get("role") in ("hod", "admin")
        if not (latest_cgpa > 3.5 and payload.hod_approved and approver_role):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credit hour limit exceeded (max 18). Requires GPA > 3.5 and HOD/Admin approval.",
            )

    enrollment = SisEnrollment(
        student_id=payload.student_id,
        course_id=payload.course_id,
        status="Enrolled",
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments/me", response_model=List[EnrollmentOut])
def get_my_enrollments(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all enrollments for the authenticated student or faculty member's courses."""
    # Try to find as student first
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    
    if student:
        # Return student enrollments
        enrollments = (
            db.query(SisEnrollment)
            .filter(SisEnrollment.student_id == student.student_id)
            .all()
        )
        return enrollments
    
    # If not a student, check if faculty and return their teaching courses
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    
    if faculty:
        # Get all courses taught by this faculty member
        courses = (
            db.query(LmsCourse)
            .filter(LmsCourse.faculty_id == faculty.faculty_id)
            .all()
        )
        
        if not courses:
            return []
        
        course_ids = [course.course_id for course in courses]
        enrollments = (
            db.query(SisEnrollment)
            .filter(SisEnrollment.course_id.in_(course_ids))
            .all()
        )
        return enrollments
    
    return []


@router.delete("/enrollments/{enrollment_id}", response_model=MessageResponse)
def drop_enrollment(
    enrollment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Withdraw from an enrolled course (soft-delete by setting status)."""
    enrollment = (
        db.query(SisEnrollment)
        .filter(SisEnrollment.enrollment_id == enrollment_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    if enrollment.status == "Withdrawn":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enrollment is already withdrawn",
        )

    enrollment.status = "Withdrawn"
    db.commit()
    return {"message": "Course dropped successfully"}


# ========================================================================== #
#  TRANSCRIPTS                                                                #
# ========================================================================== #

@router.get("/transcripts/me", response_model=List[TranscriptOut])
def get_my_transcripts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the authenticated student's full transcript."""
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for the current user",
        )

    transcripts = (
        db.query(SisTranscript)
        .filter(SisTranscript.student_id == student.student_id)
        .order_by(SisTranscript.semester_id)
        .all()
    )

    result = []
    for t in transcripts:
        semester_title = t.semester.title if t.semester else None
        result.append(
            TranscriptOut(
                transcript_id=t.transcript_id,
                student_id=t.student_id,
                semester_id=t.semester_id,
                sgpa=t.sgpa,
                cgpa=t.cgpa,
                generated_at=t.generated_at,
                semester_title=semester_title,
            )
        )
    return result


async def _get_global_settings() -> dict:
    """Fetch global university settings from Operations Service."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.GATEWAY_URL}/api/v1/ops/settings",
                timeout=2.0
            )
            if response.status_code == 200:
                return response.json()
    except Exception as exc:
        logger.error("Failed to fetch global settings: %s", exc)
    return {
        "campusName": "Project Nexus",
        "campusAddress": "University Campus"
    }


@router.get("/transcripts/me/pdf")
async def download_transcript_pdf(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate and return the student's transcript as a PDF with dynamic branding.
    Access is blocked if the student has any unpaid invoices.
    """
    # Resolve the student record
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for the current user",
        )

    # Check for unpaid financial dues
    unpaid = (
        db.query(FinInvoice)
        .filter(
            FinInvoice.student_id == student.student_id,
            FinInvoice.status == "Unpaid",
        )
        .first()
    )
    if unpaid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please clear dues to access transcript.",
        )

    # Resolve Student Name from Auth Service
    student_name = current_user.get("name", "N/A")
    if student.user_id:
        try:
            async with httpx.AsyncClient() as client:
                auth_resp = await client.post(
                    f"{settings.GATEWAY_URL}/api/v1/auth/users/bulk",
                    json=[str(student.user_id)],
                    timeout=2.0
                )
                if auth_resp.status_code == 200:
                    auth_data = auth_resp.json()
                    if auth_data:
                        u = auth_data[0]
                        student_name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u.get("email", "N/A")
        except Exception as e:
            logger.error("Failed to resolve student name: %s", e)

    # Fetch dynamic branding
    campus_info = await _get_global_settings()
    university_name = campus_info.get("campusName", "Punjab University Gujranwala Campus")
    university_address = campus_info.get("campusAddress", "University Campus")
    logo_data = campus_info.get("campusLogo")

    # Fetch transcript rows
    transcripts = (
        db.query(SisTranscript)
        .filter(SisTranscript.student_id == student.student_id)
        .order_by(SisTranscript.semester_id)
        .all()
    )

    # --- PROFESSIONAL TRANSCRIPT REDESIGN (V2) ---
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 1.5 * cm
    content_width = width - (2 * margin)

    # 1. Header (Dynamic Branding)
    # Clean White Background
    pdf.setFillColorRGB(1, 1, 1)
    pdf.rect(0, height - 4.5 * cm, width, 4.5 * cm, fill=1, stroke=0)
    
    # Logo Placement
    logo_w = 2.2 * cm
    header_text_x = margin
    if logo_data and logo_data.startswith("data:image"):
        try:
            header_str, encoded = logo_data.split(",", 1)
            img_data = base64.b64decode(encoded)
            img = ImageReader(io.BytesIO(img_data))
            # Draw logo slightly higher
            pdf.drawImage(img, margin, height - 3.2 * cm, width=logo_w, preserveAspectRatio=True, mask='auto')
            header_text_x = margin + logo_w + 0.4 * cm
        except Exception as e:
            logger.error("Failed to draw logo in SIS: %s", e)

    # University Info (Left Aligned)
    pdf.setFillColorRGB(0, 0, 0) # Explicit Black
    pdf.setFont("Helvetica-Bold", 14)
    # Ensure university name is not too long for the line
    display_name = university_name.upper()
    if len(display_name) > 50:
        pdf.setFont("Helvetica-Bold", 11) # Scale down if very long
    pdf.drawString(header_text_x, height - 2.0 * cm, display_name)
    
    pdf.setFont("Helvetica", 9)
    pdf.setFillColorRGB(0.2, 0.2, 0.2)
    pdf.drawString(header_text_x, height - 2.5 * cm, university_address[:100])
    pdf.setFillColorRGB(0, 0, 0)

    # Document Label (Right)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawRightString(width - margin, height - 2.0 * cm, "ACADEMIC TRANSCRIPT")
    pdf.setFont("Helvetica", 10)
    pdf.drawRightString(width - margin, height - 2.8 * cm, "OFFICIAL RECORD")
    pdf.drawRightString(width - margin, height - 3.3 * cm, f"ISSUE DATE: {datetime.now().strftime('%d %b %Y')}")

    # Separator Line
    pdf.setStrokeColorRGB(0.8, 0.8, 0.8)
    pdf.setLineWidth(0.5)
    pdf.line(margin, height - 4.0 * cm, width - margin, height - 4.0 * cm)

    # 2. Student Information
    y = height - 5.0 * cm
    pdf.setFont("Helvetica-Bold", 10)
    pdf.setFillColorRGB(0.4, 0.4, 0.4)
    pdf.drawString(margin, y, "STUDENT INFORMATION")
    
    y -= 0.6 * cm
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(margin, y, student_name)
    pdf.setFont("Helvetica", 10)
    pdf.drawRightString(width - margin, y, f"Roll No: {student.roll_no}")
    
    y -= 0.5 * cm
    if student.program:
        pdf.setFont("Helvetica", 10)
        pdf.drawString(margin, y, f"Program: {student.program.title[:60]}")
    pdf.drawRightString(width - margin, y, f"Student ID: {student.student_id}")

    # 3. Transcript Table
    y -= 1.5 * cm
    # Table Header
    pdf.setFillColorRGB(0.3, 0.3, 0.3)
    pdf.rect(margin, y - 0.2 * cm, content_width, 0.8 * cm, fill=1, stroke=0)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(margin + 0.5 * cm, y + 0.1 * cm, "SEMESTER")
    pdf.drawCentredString(width / 2 + 1 * cm, y + 0.1 * cm, "SGPA")
    pdf.drawRightString(width - margin - 0.5 * cm, y + 0.1 * cm, "CGPA")

    y -= 0.8 * cm
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica", 10)
    
    for t in transcripts:
        pdf.setStrokeColorRGB(0.9, 0.9, 0.9)
        pdf.line(margin, y - 0.2 * cm, width - margin, y - 0.2 * cm)
        
        semester_label = t.semester.title if t.semester else f"Semester {t.semester_id}"
        pdf.drawString(margin + 0.5 * cm, y, semester_label)
        pdf.drawCentredString(width / 2 + 1 * cm, y, f"{t.sgpa:.2f}" if t.sgpa is not None else "-")
        pdf.drawRightString(width - margin - 0.5 * cm, y, f"{t.cgpa:.2f}" if t.cgpa is not None else "-")
        
        y -= 0.8 * cm
        if y < 3 * cm:
            pdf.showPage()
            y = height - 2 * cm

    # 4. Final CGPA highlight
    if transcripts:
        final_t = transcripts[-1]
        y -= 0.5 * cm
        pdf.setFillColorRGB(0.95, 0.95, 0.95)
        pdf.rect(width - 7 * cm, y - 0.3 * cm, 7 * cm - margin, 0.9 * cm, fill=1, stroke=0)
        pdf.setFillColorRGB(0, 0, 0)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(width - 6.5 * cm, y + 0.1 * cm, "FINAL CGPA")
        pdf.drawRightString(width - margin - 0.3 * cm, y + 0.1 * cm, f"{final_t.cgpa:.2f}" if final_t.cgpa is not None else "N/A")

    # 5. Footer
    pdf.setFillColorRGB(0.5, 0.5, 0.5)
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawCentredString(width/2, margin, "This transcript is a computer generated official academic record.")
    pdf.drawCentredString(width/2, margin - 0.4 * cm, f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename=transcript_{student.roll_no}.pdf"
            )
        },
    )


# ========================================================================== #
#  SEMESTERS                                                                  #
# ========================================================================== #

@router.get("/semesters", response_model=List[SemesterOut])
def list_semesters(db: Session = Depends(get_db)):
    """List all semesters."""
    return db.query(SisSemester).order_by(SisSemester.semester_id).all()


@router.get("/semesters/active", response_model=SemesterOut)
def get_active_semester(db: Session = Depends(get_db)):
    """Return the currently active semester."""
    semester = (
        db.query(SisSemester).filter(SisSemester.is_active == True).first()  # noqa: E712
    )
    if not semester:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active semester found",
        )
    return semester

def _populate_user_details(obj):
    """Helper to inject full_name and email from the joined AuthUser relation."""
    if not obj:
        return obj
    if hasattr(obj, "user") and obj.user:
        obj.full_name = obj.user.full_name
        obj.email = obj.user.email
    return obj

# ========================================================================== #
#  DEPARTMENTS & PROGRAMS                                                     #
# ========================================================================== #

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    """List all departments with student, faculty, and course counts."""
    departments = db.query(SisDepartment).order_by(SisDepartment.dept_id).all()
    results = []
    for dept in departments:
        # Student count: students in programs belonging to this department
        student_count = (
            db.query(SisStudent)
            .join(SisProgram)
            .filter(SisProgram.dept_id == dept.dept_id)
            .count()
        )
        
        # Faculty count
        faculty_count = db.query(SisFaculty).filter(SisFaculty.dept_id == dept.dept_id).count()
        
        # Course count
        course_count = db.query(LmsCourse).filter(LmsCourse.dept_id == dept.dept_id).count()
        
        # Growth: dummy stable value or 0
        growth = 5 + (dept.dept_id % 10)

        # Convert to dict and add extra fields for UI
        d_dict = {
            "dept_id": dept.dept_id,
            "name": dept.name,
            "code": dept.code,
            "location": dept.location,
            "students": student_count,
            "faculty": faculty_count,
            "courses": course_count,
            "growth": growth
        }
        results.append(d_dict)
    
    return results


@router.post(
    "/departments",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    """Create a new department (admin only)."""
    existing = db.query(SisDepartment).filter(SisDepartment.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Department code already exists")
    dept = SisDepartment(name=payload.name, code=payload.code, location=payload.location)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put(
    "/departments/{dept_id}",
    response_model=DepartmentOut,
    dependencies=[Depends(require_role("admin"))],
)
def update_department(dept_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    """Update a department (admin only)."""
    dept = db.query(SisDepartment).filter(SisDepartment.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete(
    "/departments/{dept_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_role("admin"))],
)
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    """Delete a department (admin only)."""
    dept = db.query(SisDepartment).filter(SisDepartment.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return MessageResponse(message="Department deleted successfully")


@router.get("/programs", response_model=List[ProgramOut])
def list_programs(db: Session = Depends(get_db)):
    """List all academic programs with student and faculty counts."""
    try:
        programs = db.query(SisProgram).order_by(SisProgram.program_id).all()
        results = []
        for p in programs:
            # Student count
            student_count = db.query(SisStudent).filter(SisStudent.program_id == p.program_id).count()
            
            # Faculty count: unique instructors assigned to courses in this program
            faculty_count = (
                db.query(LmsCourse.faculty_id)
                .filter(LmsCourse.program_id == p.program_id)
                .distinct()
                .count()
            )
            
            p_dict = {c.name: getattr(p, c.name) for c in p.__table__.columns}
            p_dict["student_count"] = student_count
            p_dict["faculty_count"] = faculty_count
            results.append(p_dict)
            
        return results
    except Exception as e:
        print(f"ERROR in list_programs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/programs",
    response_model=ProgramOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
def create_program(payload: ProgramCreate, db: Session = Depends(get_db)):
    """Create a new academic program (admin only)."""
    program = SisProgram(**payload.model_dump())
    db.add(program)
    db.commit()
    db.refresh(program)
    return program


@router.put(
    "/programs/{program_id}",
    response_model=ProgramOut,
    dependencies=[Depends(require_role("admin"))],
)
def update_program(program_id: int, payload: ProgramUpdate, db: Session = Depends(get_db)):
    """Update an academic program (admin only)."""
    program = db.query(SisProgram).filter(SisProgram.program_id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(program, field, value)
    db.commit()
    db.refresh(program)
    return program


CHAT_SERVICE_URL = "http://chat-service:8000/api/v1/chat"

async def _sync_chat_group_for_course(course_id: int, db: Session):
    """
    Ensures a chat group exists for this course and includes all 
    enrolled students and the instructor.
    """
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        return

    group_name = f"{course.code} - {course.title}"

    # Get all enrolled students' user_ids
    enrollments = db.query(SisEnrollment).filter(SisEnrollment.course_id == course_id).all()
    student_ids = [e.student_id for e in enrollments]
    students = db.query(SisStudent).filter(SisStudent.student_id.in_(student_ids)).all()
    participant_ids = [str(s.user_id) for s in students]

    # Add teacher user_id
    if course.faculty_id:
        faculty = db.query(SisFaculty).filter(SisFaculty.faculty_id == course.faculty_id).first()
        if faculty:
            participant_ids.append(str(faculty.user_id))

    if not participant_ids:
        return

    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "name": group_name,
                "participant_ids": participant_ids,
                "external_id": f"course_{course_id}"
            }
            headers = {
                "X-Internal-Secret": settings.JWT_SECRET,
                "X-User-Id": "system",
                "X-User-Role": "admin"
            }
            await client.post(f"{CHAT_SERVICE_URL}/groups", json=payload, headers=headers)
        except Exception as e:
            print(f"Chat sync failed: {e}")

@router.post(
    "/programs/{program_id}/enroll-all",
    response_model=MessageResponse,
    dependencies=[Depends(require_role("admin"))],
)
async def enroll_all_students_in_program(program_id: int, db: Session = Depends(get_db)):
    """
    Auto-enroll all students of a program into all available courses 
    that belong to this program.
    """
    program = db.query(SisProgram).filter(SisProgram.program_id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    students = db.query(SisStudent).filter(SisStudent.program_id == program_id).all()
    if not students:
        return MessageResponse(message="No students found in this program")

    # Find all courses for this program
    courses = db.query(LmsCourse).filter(LmsCourse.program_id == program_id).all()
    if not courses:
        return MessageResponse(message="No courses linked to this program")

    enrollment_count = 0
    course_ids_to_sync = set()
    for student in students:
        for course in courses:
            # Check if already enrolled
            existing = db.query(SisEnrollment).filter(
                SisEnrollment.student_id == student.student_id,
                SisEnrollment.course_id == course.course_id
            ).first()
            
            if not existing:
                enrollment = SisEnrollment(
                    student_id=student.student_id,
                    course_id=course.course_id,
                    status="Enrolled"
                )
                db.add(enrollment)
                enrollment_count += 1
                course_ids_to_sync.add(course.course_id)
    
    db.commit()

    # Sync chat groups
    for cid in course_ids_to_sync:
        await _sync_chat_group_for_course(cid, db)

    return MessageResponse(message=f"Successfully enrolled students. {enrollment_count} new enrollments created. Chat groups synchronized.")


@router.delete(
    "/programs/{program_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_role("admin"))],
)
def delete_program(program_id: int, db: Session = Depends(get_db)):
    """Delete an academic program (admin only)."""
    program = db.query(SisProgram).filter(SisProgram.program_id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    db.delete(program)
    db.commit()
    return MessageResponse(message="Program deleted successfully")


# ========================================================================== #
#  FACULTY (admin-only management)                                            #
# ========================================================================== #

@router.get(
    "/faculty",
    response_model=List[FacultyOut],
    dependencies=[Depends(require_role("admin"))],
)
def list_faculty(db: Session = Depends(get_db)):
    """List all faculty members (admin only)."""
    return db.query(SisFaculty).order_by(SisFaculty.faculty_id).all()


@router.post(
    "/faculty",
    response_model=FacultyOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
def create_faculty(
    payload: FacultyCreate,
    db: Session = Depends(get_db),
):
    """Create a new faculty profile (admin only)."""
    existing = (
        db.query(SisFaculty)
        .filter(SisFaculty.employee_code == payload.employee_code)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A faculty member with this employee code already exists",
        )

    faculty = SisFaculty(**payload.model_dump())
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return faculty


@router.put(
    "/faculty/{faculty_id:int}",
    response_model=FacultyOut,
    dependencies=[Depends(require_role("admin"))],
)
def update_faculty(
    faculty_id: int,
    payload: FacultyUpdate,
    db: Session = Depends(get_db),
):
    """Update a faculty member's profile (admin only)."""
    faculty = (
        db.query(SisFaculty).filter(SisFaculty.faculty_id == faculty_id).first()
    )
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty member not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(faculty, field, value)

    db.commit()
    db.refresh(faculty)
    return faculty


@router.get("/faculty/me", response_model=FacultyOut)
def get_my_faculty_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated teacher's own faculty profile."""
    faculty = (
        db.query(SisFaculty)
        .options(joinedload(SisFaculty.user))
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found for the current user",
        )
    return _populate_user_details(faculty)


@router.put("/faculty/me", response_model=FacultyOut)
def update_my_faculty_profile(
    payload: FacultyUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated teacher's own faculty profile."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found for the current user",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(faculty, field, value)

    db.commit()
    db.refresh(faculty)
    return faculty


# ========================================================================== #
#  NOTIFICATIONS                                                              #
# ========================================================================== #

@router.get("/notifications", response_model=List[NotificationOut])
def list_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notifications for the authenticated user."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == str(current_user["user_id"]))
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.put("/notifications/{notification_id}/read", response_model=MessageResponse)
def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id,
            Notification.user_id == str(current_user["user_id"]),
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return MessageResponse(message="Notification marked as read")


@router.put("/notifications/read-all", response_model=MessageResponse)
def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for the authenticated user."""
    db.query(Notification).filter(
        Notification.user_id == str(current_user["user_id"]),
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return MessageResponse(message="All notifications marked as read")


# ========================================================================== #
#  GRADE CACHE (Redis — FYP Table 145)                                        #
# ========================================================================== #

@router.get("/grades/{student_id}/{course_id}")
def get_grade_cached(
    student_id: int,
    course_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a student's grade for a specific course.
    """
    cache_key = f"grade:{student_id}:{course_id}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    enrollment = (
        db.query(SisEnrollment)
        .filter(SisEnrollment.student_id == student_id, SisEnrollment.course_id == course_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    grade_data = {
        "grade": enrollment.status or "",
        "gpa": enrollment.final_grade_points or 0.0,
        "updated_at": datetime.utcnow().isoformat(),
    }

    try:
        redis_client.setex(cache_key, 7200, json.dumps(grade_data))
    except Exception:
        pass

    return grade_data


# ========================================================================== #
#  CGPA LEADERBOARD (Redis — FYP Table 147)                                   #
# ========================================================================== #

@router.get("/leaderboard/{program_id}/{semester_id}")
def get_cgpa_leaderboard(
    program_id: int,
    semester_id: int,
    top: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    CGPA leaderboard for a program+semester.
    """
    cache_key = f"leaderboard:{program_id}:{semester_id}"

    try:
        cached = redis_client.zrevrange(cache_key, 0, top - 1, withscores=True)
        if cached:
            return [
                {"student_id": sid, "cgpa": round(score, 2)}
                for sid, score in cached
            ]
    except Exception:
        pass

    students = (
        db.query(SisStudent)
        .filter(SisStudent.program_id == program_id)
        .all()
    )

    leaderboard_data = []
    for student in students:
        transcript = (
            db.query(SisTranscript)
            .filter(
                SisTranscript.student_id == student.student_id,
                SisTranscript.semester_id == semester_id,
            )
            .first()
        )
        if transcript and transcript.cgpa is not None:
            leaderboard_data.append({
                "student_id": str(student.student_id),
                "cgpa": float(transcript.cgpa),
            })

    try:
        if leaderboard_data:
            pipe = redis_client.pipeline()
            pipe.delete(cache_key)
            for entry in leaderboard_data:
                pipe.zadd(cache_key, {entry["student_id"]: entry["cgpa"]})
            pipe.expire(cache_key, 3600)
            pipe.execute()
    except Exception:
        pass

    leaderboard_data.sort(key=lambda x: x["cgpa"], reverse=True)
    return [
        {"student_id": e["student_id"], "cgpa": round(e["cgpa"], 2)}
        for e in leaderboard_data[:top]
    ]

@router.get("/students/me/teachers", response_model=List[dict])
async def get_my_teachers(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the list of teachers for the courses the current student is enrolled in."""
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    enrollments = db.query(SisEnrollment).filter(SisEnrollment.student_id == student.student_id).all()
    course_ids = [e.course_id for e in enrollments]
    
    courses = db.query(LmsCourse).filter(LmsCourse.course_id.in_(course_ids)).all()
    faculty_ids = [c.faculty_id for c in courses if c.faculty_id]
    
    faculty_members = db.query(SisFaculty).filter(SisFaculty.faculty_id.in_(faculty_ids)).all()
    
    user_ids = [str(f.user_id) for f in faculty_members]
    user_map = await _resolve_identities(user_ids)
    
    result = []
    for f in faculty_members:
        u_info = user_map.get(str(f.user_id), {})
        result.append({
            "faculty_id": f.faculty_id,
            "user_id": str(f.user_id),
            "name": f"{u_info.get('first_name', '')} {u_info.get('last_name', '')}".strip() or "Teacher",
            "email": u_info.get("email", ""),
            "avatar": u_info.get("avatar"),
            "designation": f.designation,
            "employee_code": f.employee_code
        })
    return result


@router.get("/faculty/me/students", response_model=List[dict])
def get_my_students(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the students enrolled in the authenticated faculty member's courses."""
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")

    courses = (
        db.query(LmsCourse)
        .filter(LmsCourse.faculty_id == faculty.faculty_id)
        .all()
    )
    course_ids = [c.course_id for c in courses]
    if not course_ids:
        return []

    enrollments = (
        db.query(SisEnrollment)
        .options(
            joinedload(SisEnrollment.student).joinedload(SisStudent.user),
            joinedload(SisEnrollment.student).joinedload(SisStudent.program),
            joinedload(SisEnrollment.course),
        )
        .filter(SisEnrollment.course_id.in_(course_ids))
        .all()
    )
    if not enrollments:
        return []

    student_ids = sorted({enrollment.student_id for enrollment in enrollments})
    latest_transcripts = {}
    if student_ids:
        transcripts = (
            db.query(SisTranscript)
            .filter(SisTranscript.student_id.in_(student_ids))
            .order_by(SisTranscript.student_id.asc(), SisTranscript.generated_at.desc(), SisTranscript.transcript_id.desc())
            .all()
        )
        for transcript in transcripts:
            latest_transcripts.setdefault(transcript.student_id, transcript)

    students_by_id = {}
    for enrollment in enrollments:
        student = enrollment.student
        course = enrollment.course
        if not student or not course:
            continue

        transcript = latest_transcripts.get(student.student_id)
        student_entry = students_by_id.setdefault(
            student.student_id,
            {
                "student_id": student.student_id,
                "user_id": str(student.user_id),
                "full_name": student.user.full_name if student.user else f"Student {student.student_id}",
                "email": student.user.email if student.user else None,
                "roll_no": student.roll_no,
                "phone": student.phone,
                "program_id": student.program_id,
                "program_code": student.program.code if student.program and student.program.code else None,
                "program_title": student.program.title if student.program else None,
                "current_semester": student.current_semester,
                "current_risk_status": student.current_risk_status or "Green",
                "cgpa": round(float(transcript.cgpa), 2) if transcript and transcript.cgpa is not None else 0.0,
                "courses": [],
                "_seen_courses": set(),
            },
        )

        course_key = course.course_id
        if course_key in student_entry["_seen_courses"]:
            continue

        student_entry["_seen_courses"].add(course_key)
        student_entry["courses"].append(
            {
                "course_id": course.course_id,
                "course_code": course.code,
                "course_name": course.title,
                "room_no": course.room_no,
                "semester_id": course.semester_id,
            }
        )

    result = []
    for entry in students_by_id.values():
        entry["courses"].sort(key=lambda item: item["course_id"] or 0)
        entry["course_count"] = len(entry["courses"])
        entry["primary_course"] = entry["courses"][0]["course_name"] if entry["courses"] else "N/A"
        entry.pop("_seen_courses", None)
        result.append(entry)

    result.sort(key=lambda item: (item.get("full_name") or "", item.get("roll_no") or ""))
    return result

@router.get("/students/me/classmates", response_model=List[dict])
def get_my_classmates(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the list of classmates (students in the same courses)."""
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    enrollments = db.query(SisEnrollment).filter(SisEnrollment.student_id == student.student_id).all()
    course_ids = [e.course_id for e in enrollments]
    
    # Get all enrollments for these courses, excluding self
    all_enrollments = db.query(SisEnrollment).filter(
        SisEnrollment.course_id.in_(course_ids),
        SisEnrollment.student_id != student.student_id
    ).all()
    
    other_student_ids = list(set([e.student_id for e in all_enrollments]))
    
    classmates = db.query(SisStudent).filter(SisStudent.student_id.in_(other_student_ids)).all()
    
    result = []
    for c in classmates:
        result.append({
            "student_id": c.student_id,
            "user_id": str(c.user_id),
            "roll_no": c.roll_no,
            "program_id": c.program_id
        })
    return result

@router.get("/courses/{course_id}/participants")
async def get_course_participants(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all students and the teacher for a specific course."""
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    faculty = db.query(SisFaculty).filter(SisFaculty.faculty_id == course.faculty_id).first() if course.faculty_id else None
    
    enrollments = db.query(SisEnrollment).filter(SisEnrollment.course_id == course_id).all()
    student_ids = [e.student_id for e in enrollments]
    students = db.query(SisStudent).filter(SisStudent.student_id.in_(student_ids)).all()
    
    # Resolve names
    user_ids = []
    if faculty:
        user_ids.append(str(faculty.user_id))
    user_ids.extend([str(s.user_id) for s in students])
    
    user_map = await _resolve_identities(user_ids)
    
    faculty_info = None
    if faculty:
        u_info = user_map.get(str(faculty.user_id), {})
        faculty_info = {
            "faculty_id": faculty.faculty_id,
            "user_id": str(faculty.user_id),
            "name": f"{u_info.get('first_name', '')} {u_info.get('last_name', '')}".strip() or "Teacher",
            "email": u_info.get("email", ""),
            "avatar": u_info.get("avatar")
        }
    
    return {
        "course_id": course_id,
        "faculty": faculty_info,
        "students": [
            {
                "student_id": s.student_id, 
                "user_id": str(s.user_id),
                "name": f"{user_map.get(str(s.user_id), {}).get('first_name', '')} {user_map.get(str(s.user_id), {}).get('last_name', '')}".strip() or "Student",
                "email": user_map.get(str(s.user_id), {}).get("email", ""),
                "avatar": user_map.get(str(s.user_id), {}).get("avatar"),
                "roll_no": s.roll_no
            }
            for s in students
        ]
    }


# ========================================================================== #
#  FACULTY AVAILABILITY                                                      #
# ========================================================================== #

@router.get("/faculty/me/availability", response_model=List[FacultyAvailabilityOut])
def get_my_availability(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    
    return db.query(SisFacultyAvailability).filter(SisFacultyAvailability.faculty_id == faculty.faculty_id).all()

@router.post("/faculty/me/availability", response_model=FacultyAvailabilityOut)
def add_availability(
    payload: FacultyAvailabilityCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    
    try:
        sh, sm = map(int, payload.start_time.split(':'))
        eh, em = map(int, payload.end_time.split(':'))
        st = time(sh, sm)
        et = time(eh, em)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

    avail = SisFacultyAvailability(
        faculty_id=faculty.faculty_id,
        day_of_week=payload.day_of_week,
        start_time=st,
        end_time=et,
        is_available=payload.is_available
    )
    db.add(avail)
    db.commit()
    db.refresh(avail)
    return avail

@router.delete("/faculty/me/availability/{avail_id}", response_model=MessageResponse)
def remove_availability(
    avail_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    
    avail = db.query(SisFacultyAvailability).filter(
        SisFacultyAvailability.avail_id == avail_id,
        SisFacultyAvailability.faculty_id == faculty.faculty_id
    ).first()
    
    if not avail:
        raise HTTPException(status_code=404, detail="Availability record not found")
    
    db.delete(avail)
    db.commit()
    return MessageResponse(message="Availability removed")
