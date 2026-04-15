"""
API route definitions for the SIS service.

All endpoints are mounted under /api/v1/sis by the main application.
"""

import io
import json
import hashlib
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.database import get_db, redis_client
from app.dependencies import get_current_user, require_role
from app.models import (
    SisStudent,
    SisFaculty,
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
    MessageResponse,
    NotificationOut,
)

router = APIRouter(prefix="/sis", tags=["SIS"])


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

    db.commit()
    db.refresh(student)
    return student


@router.get(
    "/students",
    response_model=List[StudentOut],
    dependencies=[Depends(require_role("admin"))],
)
def list_students(db: Session = Depends(get_db)):
    """List all student records (admin only)."""
    return db.query(SisStudent).all()


@router.get("/students/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single student by ID."""
    student = db.query(SisStudent).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return student


@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    current_user: dict = Depends(get_current_user),
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

    # Check for duplicate active enrollment
    existing = (
        db.query(SisEnrollment)
        .filter(
            SisEnrollment.student_id == payload.student_id,
            SisEnrollment.section_id == payload.section_id,
            SisEnrollment.status == "Enrolled",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already enrolled in this section",
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
    """List all enrollments for the authenticated student."""
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

    enrollments = (
        db.query(SisEnrollment)
        .filter(SisEnrollment.student_id == student.student_id)
        .all()
    )
    return enrollments


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
    return semester


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
    """List all academic programs."""
    return db.query(SisProgram).order_by(SisProgram.program_id).all()


@router.post(
    "/programs",
    response_model=ProgramOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
def create_program(payload: ProgramCreate, db: Session = Depends(get_db)):
    """Create a new academic program (admin only)."""
    program = SisProgram(
        dept_id=payload.dept_id,
        title=payload.title,
        degree_level=payload.degree_level,
        total_semesters=payload.total_semesters,
    )
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
    "/faculty/{faculty_id}",
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
        .filter(SisFaculty.user_id == current_user["user_id"])
        .first()
    )
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found for the current user",
        )
    return faculty


@router.put("/faculty/me", response_model=FacultyOut)
def update_my_faculty_profile(
    payload: FacultyUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated teacher's own faculty profile."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == current_user["user_id"])
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
