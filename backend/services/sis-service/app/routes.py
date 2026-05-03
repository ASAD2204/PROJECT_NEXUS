"""
API route definitions for the SIS service.

All endpoints are mounted under /api/v1/sis by the main application.
"""

import io
import json
import hashlib
import time
from datetime import datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from sqlalchemy import text
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
    LmsSection,
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
                json={"user_ids": user_ids},
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


# ========================================================================== #
#  ENROLLMENTS                                                                #
# ========================================================================== #

@router.post("/enrollments", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    payload: EnrollmentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a student for a course section."""
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

    section = (
        db.query(LmsSection)
        .filter(LmsSection.section_id == payload.section_id)
        .first()
    )
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check for duplicate active enrollment in the same COURSE
    existing_course_enrollment = (
        db.query(SisEnrollment)
        .join(LmsSection, SisEnrollment.section_id == LmsSection.section_id)
        .filter(
            SisEnrollment.student_id == payload.student_id,
            LmsSection.course_id == section.course_id,
            SisEnrollment.status == "Enrolled",
        )
        .first()
    )
    if existing_course_enrollment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student is already enrolled in this course (section: {existing_course_enrollment.section_id})",
        )

    # Section capacity check
    if section.capacity:
        enrolled_count = (
            db.query(SisEnrollment)
            .filter(
                SisEnrollment.section_id == payload.section_id,
                SisEnrollment.status == "Enrolled",
            )
            .count()
        )
        if enrolled_count >= section.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Section is full",
            )

    # Timetable conflict check with currently enrolled sections
    enrolled_section_ids = [
        r.section_id
        for r in db.query(SisEnrollment)
        .filter(
            SisEnrollment.student_id == payload.student_id,
            SisEnrollment.status == "Enrolled",
        )
        .all()
    ]
    if enrolled_section_ids:
        candidate_slots = (
            db.query(LmsTimetableSlot)
            .filter(LmsTimetableSlot.section_id == payload.section_id)
            .all()
        )
        current_slots = (
            db.query(LmsTimetableSlot)
            .filter(LmsTimetableSlot.section_id.in_(enrolled_section_ids))
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
                        detail="Timetable conflict with an already enrolled section",
                    )

    # Credit-hour cap: default 18 unless GPA > 3.5 and HOD/Admin approved
    current_credits = (
        db.query(LmsCourse.credit_hours)
        .join(LmsSection, LmsSection.course_id == LmsCourse.course_id)
        .join(SisEnrollment, SisEnrollment.section_id == LmsSection.section_id)
        .filter(
            SisEnrollment.student_id == payload.student_id,
            SisEnrollment.status == "Enrolled",
        )
        .all()
    )
    total_current_credits = sum((c[0] or 0) for c in current_credits)
    new_course_credits = (
        db.query(LmsCourse.credit_hours)
        .join(LmsSection, LmsSection.course_id == LmsCourse.course_id)
        .filter(LmsSection.section_id == payload.section_id)
        .scalar()
        or 0
    )
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
        section_id=payload.section_id,
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
    """List all enrollments for the authenticated student or faculty member's sections."""
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
    
    # If not a student, check if faculty and return their teaching sections
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    
    if faculty:
        # Get all sections taught by this faculty member
        sections = (
            db.query(LmsSection)
            .filter(LmsSection.faculty_id == faculty.faculty_id)
            .all()
        )
        
        if not sections:
            return []
        
        # Return enrollments in these sections (convert LmsSection to EnrollmentOut-like structure)
        section_ids = [section.section_id for section in sections]
        enrollments = (
            db.query(SisEnrollment)
            .filter(SisEnrollment.section_id.in_(section_ids))
            .all()
        )
        return enrollments
    
    # If neither student nor faculty, return empty list
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


@router.get("/transcripts/me/pdf")
def download_transcript_pdf(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate and return the student's transcript as a PDF.

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

    # Fetch transcript rows
    transcripts = (
        db.query(SisTranscript)
        .filter(SisTranscript.student_id == student.student_id)
        .order_by(SisTranscript.semester_id)
        .all()
    )

    # -- Build PDF in-memory ------------------------------------------------ #
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(width / 2, height - 2 * cm, "Project Nexus")

    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 3 * cm, "Official Academic Transcript")

    # Student info
    y = height - 4.5 * cm
    pdf.setFont("Helvetica", 11)
    pdf.drawString(2 * cm, y, f"Student ID: {student.student_id}")
    y -= 0.6 * cm
    pdf.drawString(2 * cm, y, f"Roll No: {student.roll_no}")
    y -= 0.6 * cm
    pdf.drawString(2 * cm, y, f"Name: {current_user.get('name', 'N/A')}")
    y -= 0.6 * cm
    if student.program:
        pdf.drawString(2 * cm, y, f"Program: {student.program.title}")
        y -= 0.6 * cm
    pdf.drawString(
        2 * cm, y,
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
    )
    y -= 1.2 * cm

    # Table header
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(2 * cm, y, "Semester")
    pdf.drawString(8 * cm, y, "SGPA")
    pdf.drawString(12 * cm, y, "CGPA")
    y -= 0.2 * cm
    pdf.line(2 * cm, y, width - 2 * cm, y)
    y -= 0.5 * cm

    # Transcript rows
    pdf.setFont("Helvetica", 10)
    for t in transcripts:
        if y < 3 * cm:
            pdf.showPage()
            y = height - 2 * cm
            pdf.setFont("Helvetica", 10)

        semester_label = t.semester.title if t.semester else f"Semester {t.semester_id}"
        pdf.drawString(2 * cm, y, semester_label)
        pdf.drawString(8 * cm, y, f"{t.sgpa:.2f}" if t.sgpa is not None else "-")
        pdf.drawString(12 * cm, y, f"{t.cgpa:.2f}" if t.cgpa is not None else "-")
        y -= 0.6 * cm

    # Footer line
    y -= 0.5 * cm
    pdf.line(2 * cm, y, width - 2 * cm, y)
    y -= 0.5 * cm
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawString(2 * cm, y, "This is a system-generated document.")

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
    return c.getvalue()

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
    """List all departments."""
    return db.query(SisDepartment).order_by(SisDepartment.dept_id).all()


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
            
            # Faculty count: unique instructors assigned to sections of courses in this program
            faculty_count = (
                db.query(LmsSection.faculty_id)
                .join(LmsCourse, LmsSection.course_id == LmsCourse.course_id)
                .filter(LmsCourse.program_id == p.program_id)
                .distinct()
                .count()
            )
            
            # Convert model to dict and add counts
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


from app.config import settings
import httpx

CHAT_SERVICE_URL = "http://chat-service:8000/api/v1/chat"

async def _sync_chat_group_for_section(section_id: int, db: Session):
    """
    Ensures a chat group exists for this section and includes all 
    enrolled students and the instructor.
    """
    section = db.query(LmsSection).filter(LmsSection.section_id == section_id).first()
    if not section:
        return

    # Get course info for naming
    course = db.query(LmsCourse).filter(LmsCourse.course_id == section.course_id).first()
    group_name = f"{course.code} - Section {section.section_id}" if course else f"Section {section.section_id}"

    # Get all enrolled students' user_ids
    enrollments = db.query(SisEnrollment).filter(SisEnrollment.section_id == section_id).all()
    student_ids = [e.student_id for e in enrollments]
    students = db.query(SisStudent).filter(SisStudent.student_id.in_(student_ids)).all()
    participant_ids = [str(s.user_id) for s in students]

    # Add teacher user_id
    if section.faculty_id:
        faculty = db.query(SisFaculty).filter(SisFaculty.faculty_id == section.faculty_id).first()
        if faculty:
            participant_ids.append(str(faculty.user_id))

    if not participant_ids:
        return

    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "name": group_name,
                "participant_ids": participant_ids,
                "external_id": f"section_{section_id}"
            }
            # Use X-Internal-Secret to bypass JWT
            headers = {
                "X-Internal-Secret": settings.JWT_SECRET,
                "X-User-Id": "system",
                "X-User-Role": "admin"
            }
            await client.post(f"{CHAT_SERVICE_URL}/groups", json=payload, headers=headers)
        except Exception as e:
            print(f"Chat sync failed: {e}")

async def _broadcast_section_enrollment(section_ids: list[int], db: Session):
    for sid in section_ids:
        await _sync_chat_group_for_section(sid, db)

@router.post(
    "/programs/{program_id}/enroll-all",
    response_model=MessageResponse,
    dependencies=[Depends(require_role("admin"))],
)
async def enroll_all_students_in_program(program_id: int, db: Session = Depends(get_db)):
    """
    Auto-enroll all students of a program into all available course sections 
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
    course_ids = [c.course_id for c in courses]
    if not course_ids:
        return MessageResponse(message="No courses linked to this program")

    # Find active sections for these courses
    sections = db.query(LmsSection).filter(LmsSection.course_id.in_(course_ids)).all()
    if not sections:
        return MessageResponse(message="No active sections found for program courses")

    enrollment_count = 0
    section_ids_to_sync = set()
    for student in students:
        for section in sections:
            # Check if already enrolled
            existing = db.query(SisEnrollment).filter(
                SisEnrollment.student_id == student.student_id,
                SisEnrollment.section_id == section.section_id
            ).first()
            
            if not existing:
                enrollment = SisEnrollment(
                    student_id=student.student_id,
                    section_id=section.section_id,
                    status="Enrolled"
                )
                db.add(enrollment)
                enrollment_count += 1
                section_ids_to_sync.add(section.section_id)
    
    db.commit()

    # Sync chat groups (Triggered by enrollments)
    for sid in section_ids_to_sync:
        await _sync_chat_group_for_section(sid, db)

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
    # Check for duplicate employee code
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
    Checks Redis cache first (FYP Table 145 — 2h TTL), then DB.
    """
    cache_key = f"grade:{student_id}:{course_id}"

    # Try cache first
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    # Query from DB
    enrollment = (
        db.query(SisEnrollment)
        .filter(SisEnrollment.student_id == student_id, SisEnrollment.section_id == course_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    grade_data = {
        "grade": enrollment.status or "",
        "gpa": enrollment.final_grade_points or 0.0,
        "updated_at": datetime.utcnow().isoformat(),
    }

    # Cache it (2-hour TTL per FYP spec)
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
    Uses Redis Sorted Set (FYP Table 147 — 1h TTL).
    """
    cache_key = f"leaderboard:{program_id}:{semester_id}"

    # Try cache first
    try:
        cached = redis_client.zrevrange(cache_key, 0, top - 1, withscores=True)
        if cached:
            return [
                {"student_id": sid, "cgpa": round(score, 2)}
                for sid, score in cached
            ]
    except Exception:
        pass

    # Build from DB
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

    # Store in Redis sorted set (1-hour TTL)
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

    # Sort and return top N
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
    section_ids = [e.section_id for e in enrollments]
    
    sections = db.query(LmsSection).filter(LmsSection.section_id.in_(section_ids)).all()
    faculty_ids = [s.faculty_id for s in sections if s.faculty_id]
    
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
    """Get the students enrolled in the authenticated faculty member's sections."""
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")

    sections = (
        db.query(LmsSection)
        .options(joinedload(LmsSection.course))
        .filter(LmsSection.faculty_id == faculty.faculty_id)
        .all()
    )
    section_ids = [section.section_id for section in sections]
    if not section_ids:
        return []

    enrollments = (
        db.query(SisEnrollment)
        .options(
            joinedload(SisEnrollment.student).joinedload(SisStudent.user),
            joinedload(SisEnrollment.student).joinedload(SisStudent.program),
            joinedload(SisEnrollment.section).joinedload(LmsSection.course),
        )
        .filter(SisEnrollment.section_id.in_(section_ids))
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
        section = enrollment.section
        if not student or not section:
            continue

        course = section.course
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
                "_seen_sections": set(),
            },
        )

        section_key = section.section_id
        if section_key in student_entry["_seen_sections"]:
            continue

        student_entry["_seen_sections"].add(section_key)
        student_entry["courses"].append(
            {
                "section_id": section.section_id,
                "course_id": section.course_id,
                "course_code": course.code if course else f"SEC-{section.section_id}",
                "course_name": course.title if course else f"Section {section.section_id}",
                "room_no": section.room_no,
                "semester_id": section.semester_id,
            }
        )

    result = []
    for entry in students_by_id.values():
        entry["courses"].sort(key=lambda item: item["section_id"] or 0)
        entry["course_count"] = len(entry["courses"])
        entry["primary_course"] = entry["courses"][0]["course_name"] if entry["courses"] else "N/A"
        entry.pop("_seen_sections", None)
        result.append(entry)

    result.sort(key=lambda item: (item.get("full_name") or "", item.get("roll_no") or ""))
    return result

@router.get("/students/me/classmates", response_model=List[dict])
def get_my_classmates(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the list of classmates (students in the same sections)."""
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    enrollments = db.query(SisEnrollment).filter(SisEnrollment.student_id == student.student_id).all()
    section_ids = [e.section_id for e in enrollments]
    
    # Get all enrollments for these sections, excluding self
    all_enrollments = db.query(SisEnrollment).filter(
        SisEnrollment.section_id.in_(section_ids),
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

@router.get("/sections/{section_id}/participants")
async def get_section_participants(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all students and the teacher for a specific section."""
    section = db.query(LmsSection).filter(LmsSection.section_id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    faculty = db.query(SisFaculty).filter(SisFaculty.faculty_id == section.faculty_id).first() if section.faculty_id else None
    
    enrollments = db.query(SisEnrollment).filter(SisEnrollment.section_id == section_id).all()
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
        "section_id": section_id,
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
    
    # Simple time parsing HH:MM
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
