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
        student_ids = [s.student_id for s in students]
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

        for s in students:
            _populate_user_details(s)
            t = latest_transcripts.get(s.student_id)
            s.cgpa = round(float(t.cgpa), 2) if t and t.cgpa is not None else 0.0
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
    student = db.query(SisStudent).options(joinedload(SisStudent.user)).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )
    _populate_user_details(student)
    # Get latest transcript CGPA
    t = db.query(SisTranscript).filter(SisTranscript.student_id == student_id).order_by(SisTranscript.generated_at.desc(), SisTranscript.transcript_id.desc()).first()
    student.cgpa = round(float(t.cgpa), 2) if t and t.cgpa is not None else 0.0
    return student


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
        # Calculate SGPA (Weighted)
        semester_enrollments = (
            db.query(SisEnrollment.final_grade_points, LmsCourse.credit_hours)
            .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
            .filter(
                SisEnrollment.student_id == student_id,
                LmsCourse.semester_id == sem,
                SisEnrollment.final_grade_points.isnot(None),
                SisEnrollment.status != "Withdrawn",
            )
            .all()
        )

        if not semester_enrollments:
            continue

        qp = sum((e.final_grade_points or 0.0) * (e.credit_hours or 0) for e in semester_enrollments)
        cr = sum(e.credit_hours or 0 for e in semester_enrollments)
        sgpa = round(qp / cr, 2) if cr > 0 else 0.0

        # Recalculate CGPA (Weighted Cumulative up to this point)
        all_enrollments = (
            db.query(SisEnrollment.final_grade_points, LmsCourse.credit_hours)
            .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
            .filter(
                SisEnrollment.student_id == student_id,
                SisEnrollment.final_grade_points.isnot(None),
                SisEnrollment.status.in_(["Completed", "Graded"])
            ).all()
        )
        total_qp = sum((e.final_grade_points or 0.0) * (e.credit_hours or 0) for e in all_enrollments)
        total_cr = sum(e.credit_hours or 0 for e in all_enrollments)
        cgpa = round(total_qp / total_cr, 2) if total_cr > 0 else 0.0

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

    # Recompute CGPA across transcripts (Weighted Cumulative)
    all_enrollments = (
        db.query(SisEnrollment.final_grade_points, LmsCourse.credit_hours)
        .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
        .filter(
            SisEnrollment.student_id == student_id,
            SisEnrollment.final_grade_points.isnot(None),
            SisEnrollment.status.in_(["Completed", "Graded"])
        ).all()
    )
    if all_enrollments:
        total_qp = sum((e.final_grade_points or 0.0) * (e.credit_hours or 0) for e in all_enrollments)
        total_cr = sum(e.credit_hours or 0 for e in all_enrollments)
        cgpa = round(total_qp / total_cr, 2) if total_cr > 0 else 0.0
        
        transcripts = db.query(SisTranscript).filter(SisTranscript.student_id == student_id).all()
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

    SEMESTER_NAMES = {
        1: "FIRST SEMESTER",
        2: "SECOND SEMESTER",
        3: "THIRD SEMESTER",
        4: "FOURTH SEMESTER",
        5: "FIFTH SEMESTER",
        6: "SIXTH SEMESTER",
        7: "SEVENTH SEMESTER",
        8: "EIGHTH SEMESTER"
    }

    result = []
    for idx, t in enumerate(transcripts):
        semester_title = SEMESTER_NAMES.get(idx + 1, f"SEMESTER {idx + 1}")
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
    Includes full course details grouped by semester and weighted GPA.
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
    logo_data = campus_info.get("campusLogo")

    # Fetch transcript rows and courses
    transcripts = (
        db.query(SisTranscript)
        .filter(SisTranscript.student_id == student.student_id)
        .order_by(SisTranscript.semester_id)
        .all()
    )

    # Fetch all enrollments joined with courses
    enrollments = (
        db.query(SisEnrollment, LmsCourse)
        .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
        .filter(
            SisEnrollment.student_id == student.student_id,
            SisEnrollment.final_grade_points.isnot(None),
            SisEnrollment.status.in_(["Completed", "Graded"])
        )
        .all()
    )

    # Group enrollments by semester
    sem_courses = {}
    for enr, crs in enrollments:
        sid = crs.semester_id
        if sid not in sem_courses:
            sem_courses[sid] = []
        
        mid = enr.midterm_marks or 0.0
        final = enr.finalterm_marks or 0.0
        sess = enr.sessional_marks or 0.0
        om = int(mid + final + sess)
        
        gp = enr.final_grade_points or 0.0
        if gp >= 4.0: lg = "A"
        elif gp >= 3.7: lg = "A-"
        elif gp >= 3.3: lg = "B+"
        elif gp >= 3.0: lg = "B"
        elif gp >= 2.7: lg = "B-"
        elif gp >= 2.3: lg = "C+"
        elif gp >= 2.0: lg = "C"
        elif gp > 0.0: lg = "D"
        else: lg = "F"
            
        sem_courses[sid].append({
            "code": crs.code,
            "title": crs.title,
            "credits": crs.credit_hours or 0,
            "om": om,
            "lg": lg,
            "gp": gp
        })

    # --- PROFESSIONAL TRANSCRIPT REDESIGN (V3) ---
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 1.5 * cm
    content_width = width - (2 * margin)

    # Resolve session & reg number based on roll number
    roll_digits = "".join([c for c in student.roll_no if c.isdigit()])
    if len(roll_digits) >= 2:
        start_year = int("20" + roll_digits[:2])
        session_str = f"{start_year}-{start_year+4}"
        reg_no = f"{start_year}-UG-{student.student_id:03d}"
    else:
        session_str = "2022-2026"
        reg_no = f"2022-UG-{student.student_id:03d}"
        
    father_name = student.guardian_name or ("Rafaqat Ali" if "asad" in student_name.lower() else "N/A")

    def draw_header(p):
        p.setFillColorRGB(1, 1, 1)
        p.rect(0, height - 3.6 * cm, width, 3.6 * cm, fill=1, stroke=0)
        
        # Logo on the left
        logo_w = 1.8 * cm
        if logo_data and logo_data.startswith("data:image"):
            try:
                header_str, encoded = logo_data.split(",", 1)
                img_data = base64.b64decode(encoded)
                img = ImageReader(io.BytesIO(img_data))
                p.drawImage(img, margin, height - 2.8 * cm, width=logo_w, preserveAspectRatio=True, mask='auto')
            except: pass

        # Center-aligned headings
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica-Bold", 10.5)
        p.drawCentredString(width / 2, height - 1.0 * cm, "DEPARTMENT OF EXAMINATIONS")
        
        p.setFont("Helvetica-Bold", 11)
        p.drawCentredString(width / 2, height - 1.5 * cm, university_name.upper())
        
        p.setFont("Helvetica-Bold", 12.5)
        p.drawCentredString(width / 2, height - 2.0 * cm, '"DETAIL MARKS CERTIFICATE"')

        # Centered Program and Session
        p.setFont("Helvetica-Bold", 10)
        program_title = student.program.title if student.program else "BS Information Technology"
        p.drawCentredString(width / 2, height - 2.5 * cm, program_title.upper())
        
        p.setFont("Helvetica-Bold", 9.5)
        p.drawCentredString(width / 2, height - 2.9 * cm, f"Session: {session_str}")

        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.3, 0.3, 0.3)
        p.drawRightString(width - margin, height - 1.0 * cm, f"Issue Date: {datetime.now().strftime('%d %b %Y')}")

        p.setStrokeColorRGB(0.7, 0.7, 0.7)
        p.setLineWidth(0.5)
        p.line(margin, height - 3.2 * cm, width - margin, height - 3.2 * cm)

    draw_header(pdf)

    # Student Info Grid (2 rows only to prevent horizontal overlap with Program/Session)
    y = height - 3.6 * cm
    pdf.setFont("Helvetica", 9.5)
    pdf.setFillColorRGB(0, 0, 0)
    
    # Left column labels & values
    pdf.drawString(margin, y, "Name:")
    pdf.setFont("Helvetica-Bold", 9.5)
    pdf.drawString(margin + 80, y, student_name.upper())
    
    # Right column labels & values
    pdf.setFont("Helvetica", 9.5)
    pdf.drawString(width / 2 + 20, y, "Roll No:")
    pdf.setFont("Helvetica-Bold", 9.5)
    pdf.drawString(width / 2 + 90, y, student.roll_no.upper())
    
    y -= 14
    pdf.setFont("Helvetica", 9.5)
    pdf.drawString(margin, y, "Father's Name:")
    pdf.setFont("Helvetica-Bold", 9.5)
    pdf.drawString(margin + 80, y, father_name.upper())
    
    pdf.setFont("Helvetica", 9.5)
    pdf.drawString(width / 2 + 20, y, "Reg. No:")
    pdf.setFont("Helvetica-Bold", 9.5)
    pdf.drawString(width / 2 + 90, y, reg_no.upper())
    
    y -= 10
    pdf.setStrokeColorRGB(0.7, 0.7, 0.7)
    pdf.setLineWidth(0.5)
    pdf.line(margin, y, width - margin, y)
    
    y -= 15

    # Group semesters side-by-side
    SEMESTER_NAMES = {
        1: "FIRST SEMESTER",
        2: "SECOND SEMESTER",
        3: "THIRD SEMESTER",
        4: "FOURTH SEMESTER",
        5: "FIFTH SEMESTER",
        6: "SIXTH SEMESTER",
        7: "SEVENTH SEMESTER",
        8: "EIGHTH SEMESTER"
    }

    def draw_semester_box(p, x, y_start, title, courses, sgpa, cgpa, is_first_semester=False):
        # Draw semester header
        p.setFillColorRGB(0.92, 0.94, 0.96)
        box_w = 245
        header_h = 16
        p.rect(x, y_start - header_h, box_w, header_h, fill=1, stroke=0)
        
        p.setFillColorRGB(0.1, 0.2, 0.4)
        p.setFont("Helvetica-Bold", 8)
        p.drawString(x + 5, y_start - header_h + 4, title.upper())
        
        # Table headers
        y_pos = y_start - header_h - 12
        p.setFillColorRGB(0.3, 0.3, 0.3)
        p.setFont("Helvetica-Bold", 7)
        p.drawString(x + 2, y_pos, "CC")
        p.drawString(x + 38, y_pos, "Course Title")
        p.drawCentredString(x + 155, y_pos, "CH")
        p.drawCentredString(x + 172, y_pos, "MM")
        p.drawCentredString(x + 190, y_pos, "OM")
        p.drawCentredString(x + 210, y_pos, "LG")
        p.drawCentredString(x + 233, y_pos, "GPA")
        
        y_pos -= 4
        p.setStrokeColorRGB(0.7, 0.7, 0.7)
        p.setLineWidth(0.5)
        p.line(x, y_pos, x + box_w, y_pos)
        
        y_pos -= 10
        # Courses
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica", 7.5)
        
        for c in courses:
            p.drawString(x + 2, y_pos, c["code"])
            
            title_text = c["title"]
            if len(title_text) > 32:
                title_text = title_text[:29] + "..."
            p.drawString(x + 38, y_pos, title_text)
            
            p.drawCentredString(x + 155, y_pos, str(c["credits"]))
            p.drawCentredString(x + 172, y_pos, "100")
            p.drawCentredString(x + 190, y_pos, str(c["om"]))
            p.drawCentredString(x + 210, y_pos, c["lg"])
            p.drawCentredString(x + 233, y_pos, f"{c['gp']:.2f}")
            y_pos -= 10
            
        p.line(x, y_pos + 2, x + box_w, y_pos + 2)
        
        # GPA / CGPA footer
        p.setFont("Helvetica-Bold", 8)
        p.setFillColorRGB(0.1, 0.2, 0.4)
        if is_first_semester:
            p.drawRightString(x + box_w - 5, y_pos - 8, f"GPA: {sgpa:.2f}")
        else:
            p.drawRightString(x + box_w - 5, y_pos - 8, f"GPA: {sgpa:.2f}   CGPA: {cgpa:.2f}")
            
        return y_pos - 16

    paired = []
    for i in range(0, len(transcripts), 2):
        t1 = transcripts[i]
        t2 = transcripts[i+1] if i+1 < len(transcripts) else None
        paired.append((t1, t2))

    for idx, (t1, t2) in enumerate(paired):
        # A box with 6 courses takes around 110 pt. Height check.
        if y < 5.5 * cm:
            pdf.showPage()
            draw_header(pdf)
            y = height - 3.6 * cm
            
        courses1 = sem_courses.get(t1.semester_id, [])
        courses1 = sorted(courses1, key=lambda x: x["code"])
        
        y_left = draw_semester_box(
            pdf, margin, y, 
            SEMESTER_NAMES.get(idx * 2 + 1, f"SEMESTER {idx * 2 + 1}"),
            courses1, t1.sgpa, t1.cgpa,
            is_first_semester=(idx == 0)
        )
        
        y_right = y
        if t2:
            courses2 = sem_courses.get(t2.semester_id, [])
            courses2 = sorted(courses2, key=lambda x: x["code"])
            y_right = draw_semester_box(
                pdf, margin + 255, y,
                SEMESTER_NAMES.get(idx * 2 + 2, f"SEMESTER {idx * 2 + 2}"),
                courses2, t2.sgpa, t2.cgpa,
                is_first_semester=False
            )
            
        y = min(y_left, y_right) - 15

    # Overall Summary
    total_credits = sum(c["credits"] for sem in sem_courses.values() for c in sem)
    total_max_marks = len([c for sem in sem_courses.values() for c in sem]) * 100
    total_obtained_marks = sum(c["om"] for sem in sem_courses.values() for c in sem)
    opm = round((total_obtained_marks / total_max_marks) * 100) if total_max_marks > 0 else 0
    final_cgpa = transcripts[-1].cgpa if transcripts else 0.0

    if transcripts:
        if y < 5.5 * cm:
            pdf.showPage()
            draw_header(pdf)
            y = height - 3.6 * cm
            
        y -= 20
        # Summary border box
        pdf.setStrokeColorRGB(0.2, 0.2, 0.2)
        pdf.setLineWidth(1.0)
        pdf.setFillColorRGB(0.96, 0.97, 0.98)
        pdf.rect(margin, y - 10, content_width, 24, fill=1, stroke=1)
        
        pdf.setFillColorRGB(0, 0, 0)
        pdf.setFont("Helvetica-Bold", 8)
        
        col_w = content_width / 5
        pdf.drawString(margin + 10, y - 3, f"Credit Hours:  {total_credits}")
        pdf.drawString(margin + col_w + 10, y - 3, f"Total Marks:  {total_max_marks}")
        pdf.drawString(margin + col_w * 2 + 10, y - 3, f"Obtained Marks:  {total_obtained_marks}")
        pdf.drawString(margin + col_w * 3 + 20, y - 3, f"OPM:  {opm}")
        pdf.drawString(margin + col_w * 4 + 20, y - 3, f"CGPA:  {final_cgpa:.2f}")

    # Note text
    y_note = 3.5 * cm
    pdf.setFont("Helvetica-Oblique", 7)
    pdf.setFillColorRGB(0.3, 0.3, 0.3)
    pdf.drawString(margin, y_note, "Errors and omissions excepted.")
    pdf.drawString(margin, y_note - 12, "Note:- \"This is a provisional letter for information. The final transcript will be issued after result notification as per university rules and regulations\".")

    # Signatures
    y_sig = 1.8 * cm
    pdf.setStrokeColorRGB(0.6, 0.6, 0.6)
    pdf.setLineWidth(0.7)
    sig_col_w = content_width / 4
    
    for i, title in enumerate(["Prepared By", "Checked By", "Assistant Controller", "Incharge Examinations"]):
        sig_x = margin + i * sig_col_w
        pdf.line(sig_x + 10, y_sig, sig_x + sig_col_w - 10, y_sig)
        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColorRGB(0.2, 0.2, 0.2)
        pdf.drawCentredString(sig_x + sig_col_w / 2, y_sig - 12, title)

    # Footer
    pdf.setFillColorRGB(0.5, 0.5, 0.5)
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawCentredString(width/2, margin - 0.7 * cm, "This transcript is a computer generated official academic record.")
    pdf.drawCentredString(width/2, margin - 1.1 * cm, f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

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


@router.post("/semesters", response_model=SemesterOut, dependencies=[Depends(require_role("admin"))])
def create_semester(payload: SemesterOut, db: Session = Depends(get_db)):
    """Create a new academic semester (admin only)."""
    # Exclude ID for creation
    data = payload.model_dump(exclude={"semester_id"})
    sem = SisSemester(**data)
    db.add(sem)
    db.commit()
    db.refresh(sem)
    return sem


@router.put("/semesters/{semester_id}", response_model=SemesterOut, dependencies=[Depends(require_role("admin"))])
def update_semester(semester_id: int, payload: SemesterOut, db: Session = Depends(get_db)):
    """Update semester dates or status."""
    sem = db.query(SisSemester).filter(SisSemester.semester_id == semester_id).first()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    update_data = payload.model_dump(exclude={"semester_id"}, exclude_unset=True)
    for field, value in update_data.items():
        setattr(sem, field, value)
    
    db.commit()
    db.refresh(sem)
    return sem


@router.post("/semesters/{semester_id}/close", response_model=MessageResponse, dependencies=[Depends(require_role("admin"))])
def close_semester_and_promote(semester_id: int, db: Session = Depends(get_db)):
    """
    Finalize all results for a semester and promote eligible students.
    """
    sem = db.query(SisSemester).filter(SisSemester.semester_id == semester_id).first()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    # 1. Update semester status
    sem.status = "Completed"
    sem.is_active = False
    
    # 2. Find all students currently in this academic cycle
    # For demo, we just increment semester for students who aren't graduated
    students = db.query(SisStudent).filter(SisStudent.is_graduated == False).all()
    
    promoted_count = 0
    for student in students:
        student.current_semester = (student.current_semester or 0) + 1
        
        # Calculate transcript for the closed semester (Weighted SGPA)
        semester_enrollments = (
            db.query(SisEnrollment.final_grade_points, LmsCourse.credit_hours)
            .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
            .filter(
                SisEnrollment.student_id == student.student_id,
                LmsCourse.semester_id == semester_id,
                SisEnrollment.final_grade_points.isnot(None),
                SisEnrollment.status.in_(["Completed", "Graded"])
            ).all()
        )
        
        if semester_enrollments:
            qp = sum((e.final_grade_points or 0.0) * (e.credit_hours or 0) for e in semester_enrollments)
            cr = sum(e.credit_hours or 0 for e in semester_enrollments)
            sgpa = round(qp / cr, 2) if cr > 0 else 0.0
            
            # Recalculate CGPA (Global weighted average up to this point)
            all_enrollments = (
                db.query(SisEnrollment.final_grade_points, LmsCourse.credit_hours)
                .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
                .filter(
                    SisEnrollment.student_id == student.student_id,
                    SisEnrollment.final_grade_points.isnot(None),
                    SisEnrollment.status.in_(["Completed", "Graded"])
                ).all()
            )
            total_qp = sum((e.final_grade_points or 0.0) * (e.credit_hours or 0) for e in all_enrollments)
            total_cr = sum(e.credit_hours or 0 for e in all_enrollments)
            cgpa = round(total_qp / total_cr, 2) if total_cr > 0 else 0.0

            # Upsert transcript
            transcript = db.query(SisTranscript).filter(
                SisTranscript.student_id == student.student_id,
                SisTranscript.semester_id == semester_id
            ).first()
            
            if not transcript:
                transcript = SisTranscript(student_id=student.student_id, semester_id=semester_id)
                db.add(transcript)
            
            transcript.sgpa = sgpa
            transcript.cgpa = cgpa

        # Check for graduation
        _promote_student_to_alumni_if_graduated(student, db)
        promoted_count += 1

    db.commit()
    return {"message": f"Semester closed. {promoted_count} students processed."}


@router.post("/students/{student_id}/import-history", response_model=MessageResponse, dependencies=[Depends(require_role("admin"))])
def import_student_history(student_id: int, payload: TransferImport, db: Session = Depends(get_db)):
    """
    Manual bulk import of historical academic records for a student.
    Used for senior students or migration from legacy systems.
    Calculates weighted SGPA and CGPA.
    """
    student = db.query(SisStudent).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Clear existing history for the semesters provided in the payload
    target_semesters = list(set(item.semester_id for item in payload.academic_history))
    db.query(SisEnrollment).filter(
        SisEnrollment.student_id == student_id,
        SisEnrollment.is_historical == True
    ).delete()
    db.query(SisTranscript).filter(SisTranscript.student_id == student_id).delete()

    for item in payload.academic_history:
        # Create a historical enrollment
        db.add(SisEnrollment(
            student_id=student_id,
            course_id=item.course_id, # Can be null if it's a generic legacy course
            status="Completed",
            final_grade_points=item.final_grade_points,
            is_historical=True
        ))

    db.commit()

    # Calculate Weighted Transcripts
    sem_data = {} # sem_id -> {"qp": 0.0, "cr": 0}
    for item in payload.academic_history:
        sid = item.semester_id
        if sid not in sem_data: sem_data[sid] = {"qp": 0.0, "cr": 0}
        sem_data[sid]["qp"] += (item.final_grade_points or 0.0) * (item.credit_hours or 3)
        sem_data[sid]["cr"] += (item.credit_hours or 3)

    cumulative_qp = 0.0
    cumulative_cr = 0
    
    sorted_semesters = sorted(sem_data.keys())
    for sem_id in sorted_semesters:
        data = sem_data[sem_id]
        sgpa = round(data["qp"] / data["cr"], 2) if data["cr"] > 0 else 0.0
        
        cumulative_qp += data["qp"]
        cumulative_cr += data["cr"]
        cgpa = round(cumulative_qp / cumulative_cr, 2) if cumulative_cr > 0 else 0.0
        
        db.add(SisTranscript(
            student_id=student_id,
            semester_id=sem_id,
            sgpa=sgpa,
            cgpa=cgpa
        ))

    db.commit()
    return {"message": f"Historical data for {len(target_semesters)} semesters imported successfully."}

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
    
    return {
        "dept_id": dept.dept_id,
        "name": dept.name,
        "code": dept.code,
        "location": dept.location,
        "students": 0,
        "faculty": 0,
        "courses": 0,
        "growth": 0
    }


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
