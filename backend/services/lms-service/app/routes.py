from datetime import datetime, time
from typing import List, Optional
import logging
import io
import csv

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, feedback_surveys
from app.dependencies import get_current_user, require_role
from app.kafka_producer import publish_grade_submitted, publish_assignment_due
from app.models import (
    LmsAssignment,
    LmsAnswer,
    LmsAttendance,
    LmsCourse,
    LmsCourseMaterial,
    LmsQuestion,
    LmsQuiz,
    LmsSection,
    LmsSubmission,
    LmsTimetableSlot,
    SisEnrollment,
    SisFaculty,
    SisStudent,
    SisDepartment,
)
import httpx
from app.schemas import (
    AssignmentCreate,
    AutoScheduleOut,
    AutoScheduleRequest,
    AutoScheduledSlotOut,
    AssignmentOut,
    AssignmentUpdate,
    AttendanceOut,
    ClassroomOut,
    CourseCreate,
    CourseOut,
    CourseDetailOut,
    CourseMaterialCreate,
    CourseMaterialOut,
    FeedbackSurveyCreate,
    FeedbackSurveyOut,
    FeedbackSummary,
    GradeSubmission,
    GradeSubmitRequest,
    MessageResponse,
    ParticipantOut,
    QuizAttempt,
    QuizAttemptOut,
    QuizAttemptStatusOut,
    QuizClassroomOut,
    QuizCreate,
    QuizOut,
    SectionCreate,
    SectionOut,
    SubmissionCreate,
    SubmissionOut,
    RecentSubmissionOut,
    TimetableSlotCreate,
    TimetableConstraintCheckOut,
    TimetableConstraintCheckRequest,
    TimetableConstraintViolation,
    TimetableSlotOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lms", tags=["LMS"])


async def _resolve_identities(user_ids: List[str]) -> dict:
    """Batch resolve UUID user_ids to {uuid: {name, email}} via Auth Service."""
    if not user_ids:
        return {}
    logger.info("Resolving identities for user_ids: %s", user_ids)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.GATEWAY_URL}/api/v1/auth/users/bulk",
                json=user_ids,  # Fix: Auth expects List[UUID], not dict
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                logger.info("Resolved %d identities", len(data))
                return {
                    str(u["user_id"]): {
                        **u,
                        "full_name": f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u.get("email", "Unknown")
                    } for u in data
                }
            else:
                logger.error("Auth bulk lookup failed: %d %s", response.status_code, response.text)
    except Exception as exc:
        logger.error("Identity resolution failed: %s", exc)
    return {}


# ── Sections ──────────────────────────────────────────────────────────────

@router.get("/sections/{section_id}/classroom", response_model=ClassroomOut)
async def get_classroom_details(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Unified endpoint for the Course Classroom view.
    Aggregates section info, course details, resolved participants, materials, and activities.
    Includes student-specific progress/scores for quizzes if applicable.
    """
    section = db.query(LmsSection).filter(LmsSection.section_id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # 1. Fetch activities & materials
    assignments = db.query(LmsAssignment).filter(LmsAssignment.section_id == section_id).all()
    quizzes = db.query(LmsQuiz).filter(LmsQuiz.section_id == section_id).all()
    materials = db.query(LmsCourseMaterial).filter(LmsCourseMaterial.section_id == section_id).all()
    
    # 2. Get enrollments (participants)
    enrollments = db.query(SisEnrollment).filter(
        SisEnrollment.section_id == section_id,
        SisEnrollment.status == "Enrolled"
    ).all()
    
    # 3. Resolve identity for current user if they are a student to get their quiz scores
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    student_quiz_map = {}
    if student:
        answers = db.query(LmsAnswer).filter(
            LmsAnswer.student_id == student.student_id,
            LmsAnswer.quiz_id.in_([q.quiz_id for q in quizzes])
        ).all()
        # Group answers by quiz to calculate score
        for ans in answers:
            if ans.quiz_id not in student_quiz_map:
                student_quiz_map[ans.quiz_id] = {"score": 0.0, "submitted_at": ans.submitted_at}
            student_quiz_map[ans.quiz_id]["score"] += (ans.score_obtained or 0.0)
            if ans.submitted_at and ans.submitted_at > (student_quiz_map[ans.quiz_id]["submitted_at"] or datetime.min):
                student_quiz_map[ans.quiz_id]["submitted_at"] = ans.submitted_at

    # 4. Wrap quizzes with attempt info
    wrapped_quizzes = []
    for q in quizzes:
        attempt_info = student_quiz_map.get(q.quiz_id, {})
        wrapped_quizzes.append(QuizClassroomOut(
            quiz_id=q.quiz_id,
            section_id=q.section_id,
            title=q.title,
            duration_minutes=q.duration_minutes,
            start_time=q.start_time,
            end_time=q.end_time,
            total_marks=q.total_marks,
            questions_count=q.questions_count,
            attempted=q.quiz_id in student_quiz_map,
            score=attempt_info.get("score"),
            submitted_at=attempt_info.get("submitted_at")
        ))

    # 5. Collect all user_ids to resolve (Faculty + Students)
    user_ids_to_resolve = []
    faculty = db.query(SisFaculty).filter(SisFaculty.faculty_id == section.faculty_id).first()
    if faculty and faculty.user_id:
        user_ids_to_resolve.append(str(faculty.user_id))
        
    student_id_map = {}
    for e in enrollments:
        s_rec = db.query(SisStudent).filter(SisStudent.student_id == e.student_id).first()
        if s_rec and s_rec.user_id:
            uid = str(s_rec.user_id)
            user_ids_to_resolve.append(uid)
            student_id_map[uid] = s_rec

    # 6. Resolve identities in bulk
    identities = await _resolve_identities(list(set(user_ids_to_resolve)))
    
    # 7. Build participants list
    participants = []
    for uid, s_rec in student_id_map.items():
        ident = identities.get(uid, {})
        name = ident.get("full_name") or f"{ident.get('first_name', '')} {ident.get('last_name', '')}".strip() or f"Student {s_rec.student_id}"
        participants.append(ParticipantOut(
            student_id=s_rec.student_id,
            user_id=uid,
            name=name,
            roll_no=s_rec.roll_no,
            email=ident.get("email"),
            avatar=ident.get("avatar")
        ))
        
    # 8. Build faculty info
    fac_uid = str(faculty.user_id) if faculty else None
    fac_ident = identities.get(fac_uid, {}) if fac_uid else {}
    fac_name = fac_ident.get("full_name") or f"{fac_ident.get('first_name', '')} {fac_ident.get('last_name', '')}".strip() or "Instructor"
    
    return ClassroomOut(
        section_id=section.section_id,
        course=section.course,
        faculty_id=section.faculty_id,
        faculty_name=fac_name,
        faculty_email=fac_ident.get("email") or "",
        room_no=section.room_no,
        assignments=assignments,
        quizzes=wrapped_quizzes,
        materials=materials,
        participants=participants,
        enrolled_count=len(participants)
    )


@router.get("/sections", response_model=List[SectionOut])
def list_sections(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return db.query(LmsSection).offset(skip).limit(limit).all()
    except Exception as e:
        print(f"ERROR in list_sections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _resolve_student_id(db: Session, user_id: str) -> int:
    """Resolve the integer student_id from a UUID user_id."""
    student = db.query(SisStudent).filter(SisStudent.user_id == str(user_id)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    return student.student_id


@router.post("/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(
    payload: SectionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    section = LmsSection(**payload.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.put("/sections/{section_id}", response_model=SectionOut)
def update_section(
    section_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    section = db.query(LmsSection).filter(LmsSection.section_id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    allowed = {"faculty_id", "room_no", "capacity", "semester_id"}
    for k, v in payload.items():
        if k in allowed:
            setattr(section, k, v)

    db.commit()
    db.refresh(section)
    return section

# ── Courses ───────────────────────────────────────────────────────────────

@router.get("/courses/admin/list", response_model=List[CourseDetailOut])
def list_courses_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return courses with sections and enrollment data for admin views.
    Aggregates enrollment counts across all sections for each course.
    """
    courses = db.query(LmsCourse).offset(skip).limit(limit).all()
    result = []

    for course in courses:
        sections = db.query(LmsSection).filter(LmsSection.course_id == course.course_id).all()
        
        total_enrolled = 0
        total_capacity = 0
        sections_data = []
        
        for section in sections:
            enrolled_count = db.query(SisEnrollment).filter(
                SisEnrollment.section_id == section.section_id,
                SisEnrollment.status == "Enrolled"
            ).count()
            total_enrolled += enrolled_count
            total_capacity += section.capacity or 0
            
            sections_data.append({
                "section_id": section.section_id,
                "semester_id": section.semester_id,
                "faculty_id": section.faculty_id,
                "room_no": section.room_no,
                "capacity": section.capacity,
                "enrolled": enrolled_count,
            })
        
        result.append({
            "course_id": course.course_id,
            "dept_id": course.dept_id,
            "program_id": course.program_id,
            "code": course.code,
            "title": course.title,
            "credit_hours": course.credit_hours,
            "description": course.description,
            "cover_image": course.cover_image,
            "capacity": total_capacity,
            "enrolled": total_enrolled,
            "sections": sections_data,
        })

    return result


@router.get("/courses", response_model=List[CourseOut])
def list_courses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(LmsCourse).offset(skip).limit(limit).all()


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    existing = db.query(LmsCourse).filter(LmsCourse.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Course code already exists")
    course = LmsCourse(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses/{course_id:int}", response_model=CourseOut)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/courses/{course_id:int}", response_model=CourseOut)
def update_course(
    course_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    allowed_fields = {"dept_id", "code", "title", "credit_hours", "description", "cover_image", "program_id"}
    for field, value in payload.items():
        if field in allowed_fields:
            setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


@router.get("/courses/my-courses", response_model=List[dict])
async def my_courses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return courses for the logged-in user (Teacher or Student)."""
    user_id = str(current_user["user_id"])
    role = current_user.get("role")
    results = []

    # ── TEACHER FLOW ────────────────────────────────────────────────────────
    if role in ["teacher", "faculty"]:
        faculty = db.query(SisFaculty).filter(SisFaculty.user_id == user_id).first()
        if not faculty:
            return []
        
        sections = db.query(LmsSection).filter(LmsSection.faculty_id == faculty.faculty_id).all()
        for s in sections:
            enrolled_count = db.query(SisEnrollment).filter(SisEnrollment.section_id == s.section_id).count()
            assignments_count = db.query(LmsAssignment).filter(LmsAssignment.section_id == s.section_id).count()
            quizzes_count = db.query(LmsQuiz).filter(LmsQuiz.section_id == s.section_id).count()
            
            total_att = db.query(LmsAttendance).filter(LmsAttendance.section_id == s.section_id).count()
            present_att = db.query(LmsAttendance).filter(LmsAttendance.section_id == s.section_id, LmsAttendance.status == "Present").count()
            att_pct = (present_att / total_att * 100) if total_att > 0 else 0.0
            
            results.append({
                "id": s.section_id,
                "section_id": s.section_id,
                "course_id": s.course_id,
                "room_no": s.room_no,
                "enrolled_students": enrolled_count,
                "assignments_count": assignments_count,
                "quizzes_count": quizzes_count,
                "attendance_percentage": round(att_pct, 2),
                "title": s.course.title if s.course else f"Section {s.section_id}",
                "code": s.course.code if s.course else f"SEC-{s.section_id}",
                "credit_hours": s.course.credit_hours if s.course else 0,
                "progress": 100, # Teachers see full progress
                "instructor": current_user.get("name") or "You"
            })

    # ── STUDENT FLOW ────────────────────────────────────────────────────────
    else:
        student = db.query(SisStudent).filter(SisStudent.user_id == user_id).first()
        if not student:
            return []

        enrollments = db.query(SisEnrollment).filter(
            SisEnrollment.student_id == student.student_id,
            SisEnrollment.status == "Enrolled"
        ).all()
        
        section_ids = [e.section_id for e in enrollments]
        sections = db.query(LmsSection).filter(LmsSection.section_id.in_(section_ids)).all()
        
        # Collect faculty user_ids for name resolution
        faculty_user_ids = []
        faculty_map = {} # faculty_id -> user_id
        for s in sections:
            if s.faculty_id:
                fac = db.query(SisFaculty).filter(SisFaculty.faculty_id == s.faculty_id).first()
                if fac and fac.user_id:
                    uid = str(fac.user_id)
                    faculty_user_ids.append(uid)
                    faculty_map[s.faculty_id] = uid

        # Resolve faculty names in bulk
        identities = await _resolve_identities(list(set(faculty_user_ids)))

        for s in sections:
            # Progress calculation: Assignments + Quizzes
            section_assignments = db.query(LmsAssignment).filter(LmsAssignment.section_id == s.section_id).all()
            assign_ids = [a.assignment_id for a in section_assignments]
            
            section_quizzes = db.query(LmsQuiz).filter(LmsQuiz.section_id == s.section_id).all()
            quiz_ids = [q.quiz_id for q in section_quizzes]

            submitted_assignments = db.query(LmsSubmission).filter(
                LmsSubmission.student_id == student.student_id,
                LmsSubmission.assignment_id.in_(assign_ids)
            ).count() if assign_ids else 0

            attempted_quizzes = db.query(LmsAnswer.quiz_id).filter(
                LmsAnswer.student_id == student.student_id,
                LmsAnswer.quiz_id.in_(quiz_ids)
            ).distinct().count() if quiz_ids else 0
            
            total_items = len(section_assignments) + len(section_quizzes)
            completed_items = submitted_assignments + attempted_quizzes
            progress = (completed_items / total_items * 100) if total_items > 0 else 0
            
            fac_uid = faculty_map.get(s.faculty_id)
            fac_ident = identities.get(fac_uid, {}) if fac_uid else {}
            fac_name = fac_ident.get("full_name") or f"{fac_ident.get('first_name', '')} {fac_ident.get('last_name', '')}".strip() or "Instructor"
            
            # Resolve department
            dept_name = "Academic Department"
            if s.course and s.course.dept_id:
                dept = db.query(SisDepartment).filter(SisDepartment.dept_id == s.course.dept_id).first()
                if dept:
                    dept_name = dept.name

            results.append({
                "id": s.section_id,
                "section_id": s.section_id,
                "course_id": s.course_id,
                "title": s.course.title if s.course else f"Section {s.section_id}",
                "code": s.course.code if s.course else f"SEC-{s.section_id}",
                "credit_hours": s.course.credit_hours if s.course else 0,
                "instructor": fac_name,
                "instructorPhoto": fac_ident.get("avatar"),
                "progress": round(progress, 0),
                "enrolled_students": db.query(SisEnrollment).filter(SisEnrollment.section_id == s.section_id).count(),
                "coverImage": s.course.cover_image if s.course else None,
                "department": dept_name
            })

    return results


@router.delete("/courses/{course_id:int}", response_model=MessageResponse)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return MessageResponse(message="Course deleted successfully")




@router.get("/sections/{section_id}", response_model=SectionOut)
def get_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    section = db.query(LmsSection).filter(LmsSection.section_id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


@router.get("/sections/{section_id}/grades/export")
def export_gradebook(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    """Export the gradebook for a section as CSV."""
    enrollments = db.query(SisEnrollment).filter(SisEnrollment.section_id == section_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Assignment Score Avg", "Quiz Score Avg", "Final Grade Points"])
    
    for enrollment in enrollments:
        # Calculate averages for this student
        submissions = db.query(LmsSubmission).join(LmsAssignment).filter(
            LmsAssignment.section_id == section_id,
            LmsSubmission.student_id == enrollment.student_id
        ).all()
        avg_assignment = sum(s.marks_obtained or 0 for s in submissions) / len(submissions) if submissions else 0
        
        answers = db.query(LmsAnswer).filter(
            LmsAnswer.quiz_id.in_([q.quiz_id for q in db.query(LmsQuiz).filter(LmsQuiz.section_id == section_id).all()]),
            LmsAnswer.student_id == enrollment.student_id
        ).all()
        avg_quiz = sum(a.score_obtained or 0 for a in answers) / len(answers) if answers else 0

        writer.writerow([
            enrollment.student_id, 
            f"{avg_assignment:.2f}", 
            f"{avg_quiz:.2f}", 
            enrollment.final_grade_points or "N/A"
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=gradebook_section_{section_id}.csv"}
    )


@router.get("/sections/{section_id}/attendance/export")
def export_attendance_report(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    """Export the attendance report for a section as CSV."""
    records = db.query(LmsAttendance).filter(LmsAttendance.section_id == section_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Student ID", "Status", "Check-in Time"])
    
    for r in records:
        writer.writerow([
            r.date.isoformat(), r.student_id, r.status, 
            r.check_in_time.isoformat() if r.check_in_time else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_section_{section_id}.csv"}
    )


# ── Assignments ───────────────────────────────────────────────────────────

@router.get("/assignments/faculty/me", response_model=List[AssignmentOut])
def my_assignments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all assignments for the authenticated faculty member across all sections."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    if not faculty:
        return []
    
    section_ids = [
        s.section_id
        for s in db.query(LmsSection).filter(
            LmsSection.faculty_id == faculty.faculty_id
        ).all()
    ]
    if not section_ids:
        return []
    
    return (
        db.query(LmsAssignment)
        .filter(LmsAssignment.section_id.in_(section_ids))
        .order_by(LmsAssignment.due_date.desc())
        .all()
    )


@router.get("/assignments/faculty/v2", response_model=List[dict])
def my_assignments_v2(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get detailed assignments for faculty with submission stats."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == current_user["user_id"])
        .first()
    )
    if not faculty:
        return []
    
    sections = db.query(LmsSection).filter(LmsSection.faculty_id == faculty.faculty_id).all()
    section_ids = [s.section_id for s in sections]
    if not section_ids:
        return []
        
    assignments = db.query(LmsAssignment).filter(LmsAssignment.section_id.in_(section_ids)).all()
    
    results = []
    for a in assignments:
        # Submission stats
        total_submissions = db.query(LmsSubmission).filter(LmsSubmission.assignment_id == a.assignment_id).count()
        graded_submissions = db.query(LmsSubmission).filter(
            LmsSubmission.assignment_id == a.assignment_id,
            LmsSubmission.marks_obtained.isnot(None)
        ).count()
        
        # Avg grade
        avg_grade_res = db.query(func.avg(LmsSubmission.marks_obtained)).filter(LmsSubmission.assignment_id == a.assignment_id).scalar()
        
        # Enrollment in section
        total_students = db.query(SisEnrollment).filter(SisEnrollment.section_id == a.section_id).count()
        
        # Course info
        section = next((s for s in sections if s.section_id == a.section_id), None)
        
        results.append({
            "id": a.assignment_id,
            "title": a.title,
            "description": a.description,
            "dueDate": a.due_date.isoformat() if a.due_date else None,
            "totalMarks": a.total_marks,
            "sectionId": a.section_id,
            "course": section.course.code if section and section.course else "N/A",
            "courseName": section.course.title if section and section.course else "N/A",
            "status": "active" if a.due_date and a.due_date > datetime.now() else "completed",
            "type": "Assignment",
            "submissions": total_submissions,
            "graded": graded_submissions,
            "pending": total_submissions - graded_submissions,
            "totalStudents": total_students,
            "avgGrade": round(float(avg_grade_res), 1) if avg_grade_res is not None else 0
        })
        
    return results


@router.get("/assignments/section/{section_id}", response_model=List[AssignmentOut])
def section_assignments(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return (
        db.query(LmsAssignment)
        .filter(LmsAssignment.section_id == section_id)
        .order_by(LmsAssignment.due_date.desc())
        .all()
    )


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    assignment = db.query(LmsAssignment).filter(
        LmsAssignment.assignment_id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Add metadata for convenience
    if assignment.section and assignment.section.course:
        assignment.course_code = assignment.section.course.code
        assignment.course_title = assignment.section.course.title
        
    return assignment


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    assignment = LmsAssignment(**payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.put("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    assignment = db.query(LmsAssignment).filter(
        LmsAssignment.assignment_id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}", response_model=MessageResponse)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    assignment = db.query(LmsAssignment).filter(
        LmsAssignment.assignment_id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return MessageResponse(message="Assignment deleted successfully")


# ── Submissions ───────────────────────────────────────────────────────────

@router.post("/submissions", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
def submit_assignment(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    assignment = db.query(LmsAssignment).filter(
        LmsAssignment.assignment_id == payload.assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Block late submissions
    if assignment.due_date and datetime.utcnow() > assignment.due_date:
        raise HTTPException(
            status_code=400,
            detail="Submission deadline has passed",
        )

    # Resolve the integer student_id from the UUID user_id
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    submission = LmsSubmission(
        assignment_id=payload.assignment_id,
        student_id=student.student_id,
        file_ref_id=payload.file_ref_id,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.post("/submissions/upload", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
def submit_assignment_upload(
    assignment_id: int = Form(...),
    comments: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility alias for multipart assignment submission."""
    # Deadline and record validation logic reused from base submission endpoint
    assignment = db.query(LmsAssignment).filter(LmsAssignment.assignment_id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if assignment.due_date and datetime.utcnow() > assignment.due_date:
        raise HTTPException(status_code=400, detail="Submission deadline has passed")

    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    # In a real system, we would save 'file' to S3/Storage and get a URL/Ref.
    # Here, we use the filename as the file_ref_id for compatibility.
    submission = LmsSubmission(
        assignment_id=assignment_id,
        student_id=student.student_id,
        file_ref_id=file.filename,
        comments=comments
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/submissions/me", response_model=List[SubmissionOut])
def my_submissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return all submissions for the authenticated student or faculty member's sections."""
    # Try to resolve as student
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    
    if student:
        # Return student's own submissions
        return (
            db.query(LmsSubmission)
            .filter(LmsSubmission.student_id == student.student_id)
            .order_by(LmsSubmission.submitted_at.desc())
            .all()
        )
    
    # Try to resolve as faculty member
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    
    if faculty:
        # Get all sections taught by this faculty member
        sections = (
            db.query(LmsSection)
            .filter(LmsSection.faculty_id == faculty.faculty_id)
            .all()
        )
        
        if not sections:
            return []
        
        section_ids = [section.section_id for section in sections]
        
        # Return all submissions for assignments in their sections
        # Join submissions through assignments to get section_id
        return (
            db.query(LmsSubmission)
            .join(LmsAssignment, LmsSubmission.assignment_id == LmsAssignment.assignment_id)
            .filter(LmsAssignment.section_id.in_(section_ids))
            .order_by(LmsSubmission.submitted_at.desc())
            .all()
        )
    
    # If neither student nor faculty, return empty list
    return []


@router.get("/submissions/assignment/{assignment_id}", response_model=List[SubmissionOut])
def assignment_submissions(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    return (
        db.query(LmsSubmission)
        .filter(LmsSubmission.assignment_id == assignment_id)
        .all()
    )


@router.get("/submissions/faculty/recent", response_model=List[RecentSubmissionOut])
async def recent_submissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty")),
):
    """Get the most recent submissions across all sections taught by the faculty."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    if not faculty:
        return []

    sections = db.query(LmsSection).filter(LmsSection.faculty_id == faculty.faculty_id).all()
    section_ids = [s.section_id for s in sections]
    if not section_ids:
        return []

    results = (
        db.query(LmsSubmission)
        .join(LmsAssignment)
        .filter(LmsAssignment.section_id.in_(section_ids))
        .order_by(LmsSubmission.submitted_at.desc())
        .limit(10)
        .all()
    )

    if not results:
        return []
    
    # Resolve student identities
    student_ids = sorted({s.student_id for s in results if s.student_id is not None})
    students = (
        db.query(SisStudent)
        .filter(SisStudent.student_id.in_(student_ids))
        .all()
        if student_ids
        else []
    )
    student_by_id = {student.student_id: student for student in students}
    student_user_ids = [str(student.user_id) for student in students if student.user_id]
    student_map = {student.student_id: str(student.user_id) for student in students if student.user_id}
    
    identities = await _resolve_identities(list(set(student_user_ids)))
    
    out = []
    for s in results:
        assignment = getattr(s, "assignment", None)
        section = getattr(assignment, "section", None) if assignment else None
        if not assignment or not section:
            continue

        student = student_by_id.get(s.student_id)

        uid = student_map.get(s.student_id)
        ident = identities.get(uid, {}) if uid else {}

        out.append({
            "sub_id": s.sub_id,
            "assignment_id": s.assignment_id,
            "assignment_title": assignment.title,
            "student_id": s.student_id,
            "student_name": ident.get("full_name") or ident.get("name") or (student.roll_no if student else f"Student {s.student_id}"),
            "student_avatar": ident.get("avatar"),
            "submitted_at": s.submitted_at or datetime.utcnow(),
            "marks_obtained": s.marks_obtained,
            "section_id": section.section_id,
            "course_name": section.course.title if section and section.course else "N/A"
        })
    return out


@router.put("/submissions/{sub_id}/grade", response_model=SubmissionOut)
def grade_submission(
    sub_id: int,
    payload: GradeSubmission,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    submission = db.query(LmsSubmission).filter(LmsSubmission.sub_id == sub_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    submission.marks_obtained = payload.marks_obtained
    db.commit()
    db.refresh(submission)
    return submission


# ── Quizzes ───────────────────────────────────────────────────────────────

@router.post("/quizzes", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    quiz = LmsQuiz(
        section_id=payload.section_id,
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(quiz)
    db.flush()

    for q in payload.questions:
        question = LmsQuestion(
            quiz_id=quiz.quiz_id,
            text=q.text,
            question_type=q.question_type,
            marks=q.marks,
            correct_answer=q.correct_answer,
        )
        db.add(question)

    db.commit()
    db.refresh(quiz)
    return quiz


@router.get("/quizzes/faculty/me", response_model=List[QuizOut])
def my_quizzes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all quizzes for the authenticated faculty member across all sections."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    if not faculty:
        return []
    
    section_ids = [
        s.section_id
        for s in db.query(LmsSection).filter(
            LmsSection.faculty_id == faculty.faculty_id
        ).all()
    ]
    if not section_ids:
        return []
    
    return (
        db.query(LmsQuiz)
        .filter(LmsQuiz.section_id.in_(section_ids))
        .order_by(LmsQuiz.start_time.desc())
        .all()
    )


@router.get("/quizzes/faculty/v2", response_model=List[dict])
def my_quizzes_v2(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get detailed quizzes for faculty with attempt stats."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == current_user["user_id"])
        .first()
    )
    if not faculty:
        return []
    
    sections = db.query(LmsSection).filter(LmsSection.faculty_id == faculty.faculty_id).all()
    section_ids = [s.section_id for s in sections]
    if not section_ids:
        return []
        
    quizzes = db.query(LmsQuiz).filter(LmsQuiz.section_id.in_(section_ids)).all()
    
    results = []
    for q in quizzes:
        # Attempt stats
        total_attempts = db.query(LmsAnswer.student_id).filter(LmsAnswer.quiz_id == q.quiz_id).distinct().count()
        
        # Avg score
        avg_score_res = db.query(func.avg(LmsAnswer.score_obtained)).filter(LmsAnswer.quiz_id == q.quiz_id).scalar()
        
        # Questions count
        # In this simplified model, questions are part of Quiz model if using JSON or separate table
        # Let's check models.py for Quiz questions relationship
        q_count = len(q.questions) if hasattr(q, 'questions') else 0
        
        # Course info
        section = next((s for s in sections if s.section_id == q.section_id), None)
        
        results.append({
            "id": q.quiz_id,
            "title": q.title,
            "startDate": q.start_time.isoformat() if q.start_time else None,
            "duration": q.duration_minutes,
            "sectionId": q.section_id,
            "course": section.course.code if section and section.course else "N/A",
            "courseName": section.course.title if section and section.course else "N/A",
            "status": "active" if q.start_time and q.start_time < datetime.now() < q.end_time else "completed" if q.end_time and q.end_time < datetime.now() else "draft",
            "questions": q_count,
            "attempts": total_attempts,
            "avgScore": round(float(avg_score_res), 1) if avg_score_res is not None else 0,
            "totalMarks": sum(que.marks for que in q.questions) if hasattr(q, 'questions') else 0
        })
        
    return results


@router.get("/quizzes/section/{section_id}", response_model=List[QuizOut])
def section_quizzes(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(LmsQuiz).filter(LmsQuiz.section_id == section_id).all()


@router.get("/quizzes/{quiz_id}", response_model=QuizOut)
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    quiz = db.query(LmsQuiz).filter(LmsQuiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.put("/quizzes/{quiz_id}", response_model=QuizOut)
def update_quiz(
    quiz_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    quiz = db.query(LmsQuiz).filter(LmsQuiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    allowed_fields = {"title", "duration_minutes", "start_time", "end_time"}
    for field, value in payload.items():
        if field in allowed_fields:
            setattr(quiz, field, value)

    db.commit()
    db.refresh(quiz)
    return quiz


@router.delete("/quizzes/{quiz_id}", response_model=MessageResponse)
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    quiz = db.query(LmsQuiz).filter(LmsQuiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    db.query(LmsAnswer).filter(LmsAnswer.quiz_id == quiz_id).delete()
    db.query(LmsQuestion).filter(LmsQuestion.quiz_id == quiz_id).delete()
    db.delete(quiz)
    db.commit()
    return MessageResponse(message="Quiz deleted successfully")


@router.get("/quizzes/{quiz_id}/attempts", response_model=List[QuizAttemptOut])
async def get_quiz_attempts(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    """Fetch all student attempts for a specific quiz with resolved identities."""
    quiz = db.query(LmsQuiz).filter(LmsQuiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Group answers by student_id to form "attempts"
    from sqlalchemy import func
    
    # Calculate max marks for the quiz
    max_marks = db.query(func.sum(LmsQuestion.marks)).filter(LmsQuestion.quiz_id == quiz_id).scalar() or 0.0

    attempts_raw = (
        db.query(
            LmsAnswer.student_id,
            func.sum(LmsAnswer.score_obtained).label("total_score"),
            func.max(LmsAnswer.submitted_at).label("submitted_at")
        )
        .filter(LmsAnswer.quiz_id == quiz_id)
        .group_by(LmsAnswer.student_id)
        .all()
    )

    if not attempts_raw:
        return []

    # Resolve student identities
    student_ids = [a.student_id for a in attempts_raw]
    students = db.query(SisStudent).filter(SisStudent.student_id.in_(student_ids)).all()
    user_id_map = {s.student_id: str(s.user_id) for s in students}
    
    user_ids = list(set(user_id_map.values()))
    identities = await _resolve_identities(user_ids)

    results = []
    for att in attempts_raw:
        u_id = user_id_map.get(att.student_id)
        ident = identities.get(u_id, {})
        results.append({
            "student_id": att.student_id,
            "student_name": ident.get("full_name") or ident.get("name") or f"Student {att.student_id}",
            "quiz_id": quiz_id,
            "total_score": att.total_score,
            "max_marks": max_marks,
            "submitted_at": att.submitted_at or datetime.utcnow()
        })

    return results


@router.get("/quizzes/{quiz_id}/attempt-status/me", response_model=QuizAttemptStatusOut)
def get_my_quiz_attempt_status(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    quiz = db.query(LmsQuiz).filter(LmsQuiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    now = datetime.utcnow()
    can_attempt = True
    reason = None
    if quiz.start_time and now < quiz.start_time:
        can_attempt = False
        reason = "Quiz has not started yet"
    elif quiz.end_time and now > quiz.end_time:
        can_attempt = False
        reason = "Quiz attempt window has closed"

    student_id = _resolve_student_id(db, current_user["user_id"])
    answers = (
        db.query(LmsAnswer)
        .filter(LmsAnswer.student_id == student_id, LmsAnswer.quiz_id == quiz_id)
        .all()
    )

    if not answers:
        return QuizAttemptStatusOut(
            quiz_id=quiz_id,
            attempted=False,
            can_attempt=can_attempt,
            reason=reason,
            max_marks=float(sum(question.marks or 0 for question in quiz.questions)),
        )

    total_score = float(sum(answer.score_obtained or 0 for answer in answers))
    max_marks = float(sum(question.marks or 0 for question in quiz.questions))
    submitted_at = max((answer.submitted_at for answer in answers if answer.submitted_at), default=None)

    return QuizAttemptStatusOut(
        quiz_id=quiz_id,
        attempted=True,
        can_attempt=False,
        reason="Quiz already attempted",
        total_score=total_score,
        max_marks=max_marks,
        submitted_at=submitted_at,
    )


@router.post("/quizzes/{quiz_id}/attempt", response_model=MessageResponse)
def attempt_quiz(
    quiz_id: int,
    payload: QuizAttempt,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    quiz = db.query(LmsQuiz).filter(LmsQuiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    now = datetime.utcnow()
    if quiz.start_time and now < quiz.start_time:
        raise HTTPException(status_code=400, detail="Quiz has not started yet")
    if quiz.end_time and now > quiz.end_time:
        raise HTTPException(status_code=400, detail="Quiz attempt window has closed")

    student_id = _resolve_student_id(db, current_user["user_id"])
    existing_attempt = (
        db.query(LmsAnswer)
        .filter(LmsAnswer.student_id == student_id, LmsAnswer.quiz_id == quiz_id)
        .first()
    )
    if existing_attempt:
        raise HTTPException(status_code=400, detail="Quiz already attempted")

    total_score = 0.0
    for ans in payload.answers:
        question = db.query(LmsQuestion).filter(
            LmsQuestion.question_id == ans.question_id,
            LmsQuestion.quiz_id == quiz_id,
        ).first()
        if not question:
            continue

        score = 0.0
        # Auto-grade MCQs
        if question.correct_answer and ans.selected_option == question.correct_answer:
            score = question.marks
        total_score += score

        answer = LmsAnswer(
            student_id=student_id,
            quiz_id=quiz_id,
            question_id=ans.question_id,
            selected_option=ans.selected_option,
            score_obtained=score,
        )
        db.add(answer)

    db.commit()
    return MessageResponse(message=f"Quiz submitted. Total score: {total_score}")


# ── Grades ────────────────────────────────────────────────────────────────

@router.post("/grades/submit", response_model=MessageResponse)
def submit_grades(
    payload: GradeSubmitRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    requester_role = current_user.get("role", "")

    if requester_role != "admin":
        locked_row = (
            db.query(SisEnrollment)
            .filter(
                SisEnrollment.section_id == payload.section_id,
                SisEnrollment.status == "GradeLocked",
            )
            .first()
        )
        if locked_row:
            raise HTTPException(
                status_code=403,
                detail="Grades for this section are locked after final submission",
            )

    for grade in payload.grades:
        enrollment = (
            db.query(SisEnrollment)
            .filter(
                SisEnrollment.student_id == grade.student_id,
                SisEnrollment.section_id == payload.section_id,
            )
            .first()
        )
        if enrollment:
            if enrollment.status == "GradeLocked" and requester_role != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Grades are locked and can only be changed by admin",
                )
            enrollment.final_grade_points = grade.grade_points
            if payload.final_submit:
                enrollment.status = "GradeLocked"
            # Publish Kafka event
            try:
                publish_grade_submitted(
                    student_id=grade.student_id,
                    section_id=payload.section_id,
                    grade_points=grade.grade_points,
                )
            except Exception:
                pass  # Don't fail if Kafka is unavailable

    db.commit()
    return MessageResponse(message=f"Grades submitted for {len(payload.grades)} students")


# ── Timetable ─────────────────────────────────────────────────────────────

@router.post("/timetable", response_model=TimetableSlotOut, status_code=status.HTTP_201_CREATED)
def create_timetable_slot(
    payload: TimetableSlotCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    slot = LmsTimetableSlot(**payload.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.get("/timetable/section/{section_id}", response_model=List[TimetableSlotOut])
def section_timetable(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return (
        db.query(LmsTimetableSlot)
        .filter(LmsTimetableSlot.section_id == section_id)
        .order_by(LmsTimetableSlot.day_of_week, LmsTimetableSlot.start_time)
        .all()
    )


@router.post("/timetable/constraints/check", response_model=TimetableConstraintCheckOut)
def check_timetable_constraints(
    payload: TimetableConstraintCheckRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")

    section = db.query(LmsSection).filter(LmsSection.section_id == payload.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    violations: List[TimetableConstraintViolation] = []

    base_overlap_filter = and_(
        LmsTimetableSlot.day_of_week == payload.day_of_week,
        LmsTimetableSlot.start_time < payload.end_time,
        LmsTimetableSlot.end_time > payload.start_time,
        LmsTimetableSlot.section_id != payload.section_id,
    )

    if payload.room_no:
        room_conflict = (
            db.query(LmsTimetableSlot)
            .filter(base_overlap_filter, LmsTimetableSlot.room_no == payload.room_no)
            .first()
        )
        if room_conflict:
            violations.append(
                TimetableConstraintViolation(
                    type="room_conflict",
                    message=f"Room {payload.room_no} is already occupied during this interval",
                )
            )

    faculty_conflict = (
        db.query(LmsTimetableSlot)
        .join(LmsSection, LmsSection.section_id == LmsTimetableSlot.section_id)
        .filter(base_overlap_filter, LmsSection.faculty_id == section.faculty_id)
        .first()
    )
    if faculty_conflict:
        violations.append(
            TimetableConstraintViolation(
                type="faculty_conflict",
                message="Faculty has another class during this interval",
            )
        )

    return TimetableConstraintCheckOut(is_valid=len(violations) == 0, violations=violations)


@router.post("/timetable/auto-generate", response_model=AutoScheduleOut)
def auto_generate_timetable(
    payload: AutoScheduleRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    if payload.slot_minutes <= 0:
        raise HTTPException(status_code=400, detail="slot_minutes must be greater than 0")
    if payload.start_hour >= payload.end_hour:
        raise HTTPException(status_code=400, detail="start_hour must be less than end_hour")

    sections = (
        db.query(LmsSection)
        .filter(LmsSection.section_id.in_(payload.section_ids))
        .all()
    )
    section_map = {s.section_id: s for s in sections}

    missing = [sid for sid in payload.section_ids if sid not in section_map]
    if missing:
        raise HTTPException(status_code=404, detail=f"Sections not found: {missing}")

    created: List[AutoScheduledSlotOut] = []
    unscheduled: List[str] = []
    planned = []

    start_minute = payload.start_hour * 60
    end_minute = payload.end_hour * 60

    for section_id in payload.section_ids:
        section = section_map[section_id]
        room_no = section.room_no or payload.default_room
        if not room_no:
            unscheduled.append(f"Section {section.section_id}: no room available")
            continue

        assigned = False
        for day in payload.days_of_week:
            for minute in range(start_minute, end_minute - payload.slot_minutes + 1, payload.slot_minutes):
                slot_start = time(minute // 60, minute % 60)
                end_total = minute + payload.slot_minutes
                slot_end = time(end_total // 60, end_total % 60)

                db_conflict = (
                    db.query(LmsTimetableSlot)
                    .join(LmsSection, LmsSection.section_id == LmsTimetableSlot.section_id)
                    .filter(
                        LmsTimetableSlot.day_of_week == day,
                        LmsTimetableSlot.start_time < slot_end,
                        LmsTimetableSlot.end_time > slot_start,
                        or_(
                            LmsTimetableSlot.room_no == room_no,
                            LmsSection.faculty_id == section.faculty_id,
                        ),
                    )
                    .first()
                )

                if db_conflict:
                    continue

                planned_conflict = False
                for planned_slot in planned:
                    if planned_slot["day"] != day:
                        continue
                    if not _times_overlap(slot_start, slot_end, planned_slot["start"], planned_slot["end"]):
                        continue
                    if planned_slot["room_no"] == room_no or planned_slot["faculty_id"] == section.faculty_id:
                        planned_conflict = True
                        break
                if planned_conflict:
                    continue

                slot = LmsTimetableSlot(
                    section_id=section.section_id,
                    day_of_week=day,
                    start_time=slot_start,
                    end_time=slot_end,
                    room_no=room_no,
                )
                db.add(slot)
                planned.append(
                    {
                        "day": day,
                        "start": slot_start,
                        "end": slot_end,
                        "room_no": room_no,
                        "faculty_id": section.faculty_id,
                    }
                )
                created.append(
                    AutoScheduledSlotOut(
                        section_id=section.section_id,
                        day_of_week=day,
                        start_time=slot_start,
                        end_time=slot_end,
                        room_no=room_no,
                    )
                )
                assigned = True
                break

            if assigned:
                break

        if not assigned:
            unscheduled.append(
                f"Section {section.section_id}: no conflict-free slot found within provided constraints"
            )

    db.commit()
    return AutoScheduleOut(created=created, unscheduled=unscheduled)


# ── Course Materials ──────────────────────────────────────────────────────

@router.get("/materials/course/{course_id}", response_model=List[CourseMaterialOut])
def list_course_materials(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all materials for a course."""
    section_ids = [
        section.section_id
        for section in db.query(LmsSection).filter(LmsSection.course_id == course_id).all()
    ]
    if not section_ids:
        return []
    return (
        db.query(LmsCourseMaterial)
        .filter(LmsCourseMaterial.section_id.in_(section_ids))
        .order_by(LmsCourseMaterial.uploaded_at.desc())
        .all()
    )


@router.get("/materials/section/{section_id}")
def list_section_materials_compat(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility endpoint for a single section."""
    rows = (
        db.query(LmsCourseMaterial)
        .filter(LmsCourseMaterial.section_id == section_id)
        .order_by(LmsCourseMaterial.uploaded_at.desc())
        .all()
    )
    return {
        "materials": [
            {
                "id": row.material_id,
                "material_id": row.material_id,
                "section_id": row.section_id,
                "title": row.title,
                "description": row.description,
                "type": row.material_type,
                "material_type": row.material_type,
                "fileType": (row.material_type or "").upper(),
                "file_ref_id": row.file_ref_id,
                "size": "-",
                "downloads": 0,
            }
            for row in rows
        ]
    }


@router.get("/materials/{course_id}")
def list_course_materials_compat(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility endpoint with normalized material fields."""
    rows = list_course_materials(course_id=course_id, db=db, current_user=current_user)
    return {
        "materials": [
            {
                "id": row.material_id,
                "material_id": row.material_id,
                "section_id": row.section_id,
                "title": row.title,
                "description": row.description,
                "type": row.material_type,
                "material_type": row.material_type,
                "fileType": (row.material_type or "").upper(),
                "file_ref_id": row.file_ref_id,
                "size": "-",
                "downloads": 0,
            }
            for row in rows
        ]
    }


@router.post(
    "/materials",
    response_model=CourseMaterialOut,
    status_code=status.HTTP_201_CREATED,
)
def upload_course_material(
    payload: CourseMaterialCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    """Upload a course material."""
    # Resolve faculty_id for uploaded_by
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    uploader_id = faculty.faculty_id if faculty else 0

    resolved_section_id = payload.section_id
    if resolved_section_id is None and payload.course_id is not None:
        section = (
            db.query(LmsSection)
            .filter(LmsSection.course_id == payload.course_id)
            .order_by(LmsSection.section_id.asc())
            .first()
        )
        if section is not None:
            resolved_section_id = section.section_id

    if resolved_section_id is None:
        raise HTTPException(status_code=400, detail="section_id or valid course_id is required")

    resolved_file_ref = payload.file_ref_id or payload.file_url

    material = LmsCourseMaterial(
        section_id=resolved_section_id,
        title=payload.title,
        description=payload.description,
        file_ref_id=resolved_file_ref,
        material_type=payload.material_type,
        uploaded_by=uploader_id,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.post("/materials/{section_id}")
def upload_course_material_compat(
    section_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    material_type: Optional[str] = Form("document"),
    file_url: Optional[str] = Form(None),
    file_ref_id: Optional[str] = Form(None),
    uploaded_file: Optional[UploadFile] = File(None, alias="file"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    """Frontend compatibility alias for multipart material upload."""
    effective_ref = file_ref_id or file_url
    if uploaded_file is not None and uploaded_file.filename:
        effective_ref = effective_ref or uploaded_file.filename

    payload = CourseMaterialCreate(
        section_id=section_id,
        title=title,
        description=description,
        file_ref_id=effective_ref,
        material_type=material_type,
    )
    row = upload_course_material(payload=payload, db=db, current_user=current_user)
    return {
        "id": row.material_id,
        "material_id": row.material_id,
        "section_id": row.section_id,
        "title": row.title,
        "description": row.description,
        "type": row.material_type,
        "material_type": row.material_type,
        "file_ref_id": row.file_ref_id,
    }


@router.get("/materials/download/{material_id}")
def download_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Serve a course material file for download."""
    material = db.query(LmsCourseMaterial).filter(LmsCourseMaterial.material_id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # In this simulated environment, we return a simple streaming response with the filename
    # Real implementation would fetch from S3/Minio or local disk storage.
    import io
    content = f"Simulated content for {material.title}".encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={material.file_ref_id or 'document.pdf'}"}
    )


# ═══════════════════════════════════════════════════════════════════════════
# FEEDBACK SURVEYS  (MongoDB — FYP Table 142)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/feedback", response_model=FeedbackSurveyOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackSurveyCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a course evaluation or faculty feedback survey."""
    # Resolve student_id
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    student_id = student.student_id if student else None

    doc = {
        "survey_type": payload.survey_type,
        "course_id": payload.course_id,
        "section_id": payload.section_id,
        "faculty_id": payload.faculty_id,
        "student_id": student_id if not payload.is_anonymous else None,
        "responses": payload.responses,
        "overall_rating": payload.overall_rating,
        "comments": payload.comments,
        "submitted_at": datetime.utcnow().isoformat(),
        "is_anonymous": payload.is_anonymous,
        "semester_id": payload.semester_id,
    }
    result = await feedback_surveys.insert_one(doc)
    return FeedbackSurveyOut(
        id=str(result.inserted_id),
        **{k: v for k, v in doc.items() if k != "_id"},
    )


@router.get("/feedback/course/{course_id}", response_model=list[FeedbackSurveyOut])
async def get_course_feedback(
    course_id: int,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    """Get all feedback for a specific course."""
    cursor = feedback_surveys.find({"course_id": course_id}).sort("submitted_at", -1)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(FeedbackSurveyOut(**doc))
    return results


@router.get("/feedback/{course_id}", response_model=list[FeedbackSurveyOut])
async def get_course_feedback_compat(
    course_id: int,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    """Frontend compatibility alias for course feedback route."""
    return await get_course_feedback(course_id=course_id, current_user=current_user)


@router.get("/feedback/faculty/{faculty_id}", response_model=list[FeedbackSurveyOut])
async def get_faculty_feedback(
    faculty_id: int,
    semester_id: Optional[int] = None,
    current_user: dict = Depends(require_role("admin")),
):
    """Get all feedback for a specific faculty member."""
    query_filter: dict = {"faculty_id": faculty_id}
    if semester_id:
        query_filter["semester_id"] = semester_id

    cursor = feedback_surveys.find(query_filter).sort("submitted_at", -1)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(FeedbackSurveyOut(**doc))
    return results


@router.get("/feedback/faculty/{faculty_id}/summary", response_model=FeedbackSummary)
async def faculty_feedback_summary(
    faculty_id: int,
    semester_id: Optional[int] = None,
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    """Get aggregated feedback summary for a faculty member."""
    match_stage: dict = {"faculty_id": faculty_id}
    if semester_id:
        match_stage["semester_id"] = semester_id

    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": None,
                "total_reviews": {"$sum": 1},
                "avg_rating": {"$avg": "$overall_rating"},
            }
        },
    ]
    result = None
    async for doc in feedback_surveys.aggregate(pipeline):
        result = doc

    return FeedbackSummary(
        faculty_id=faculty_id,
        total_reviews=result["total_reviews"] if result else 0,
        avg_rating=round(result["avg_rating"], 2) if result else 0.0,
        semester_id=semester_id,
    )


# ═══════════════════════════════════════════════════════════════════════════
# PLAGIARISM DETECTION (ChromaDB — FYP Table 157: vectors_assignment_submissions)
# ═══════════════════════════════════════════════════════════════════════════

_chroma_client = None
SUBMISSION_COLLECTION = "vectors_assignment_submissions"
PLAGIARISM_THRESHOLD = 0.85  # cosine similarity > 0.85 → plagiarism

logger = logging.getLogger(__name__)


def _cheap_text_embedding(text: str, dims: int = 64) -> list[float]:
    """Generate a small deterministic embedding to avoid heavy model downloads."""
    vector = [0.0] * dims
    if not text:
        return vector

    for token in text.lower().split():
        h = hash(token)
        idx = abs(h) % dims
        sign = 1.0 if (h & 1) else -1.0
        vector[idx] += sign

    norm = sum(v * v for v in vector) ** 0.5
    if norm > 0:
        vector = [v / norm for v in vector]
    return vector


def _get_submissions_collection():
    """Return the ChromaDB assignment submissions collection."""
    global _chroma_client
    try:
        import chromadb
        if _chroma_client is None:
            _chroma_client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
            )
        return _chroma_client.get_or_create_collection(
            name=SUBMISSION_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
    except Exception as exc:
        logger.error("ChromaDB connection failed: %s", exc)
        return None


@router.post("/submissions/{submission_id}/check-plagiarism")
def check_plagiarism(
    submission_id: int,
    current_user: dict = Depends(require_role("admin", "faculty")),
    db: Session = Depends(get_db),
):
    """
    Check a submission for plagiarism using ChromaDB vector similarity.
    FYP Table 157: vectors_assignment_submissions (cosine similarity > 0.85).
    """
    submission = (
        db.query(LmsSubmission)
        .filter(LmsSubmission.sub_id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Prefer textual content if present; otherwise fall back to file reference text.
    content = getattr(submission, "content", None) or submission.file_ref_id or ""
    if not content.strip():
        return {"plagiarism_detected": False, "message": "No content to check"}

    collection = _get_submissions_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            detail="ChromaDB is not reachable. Plagiarism check unavailable.",
        )

    # Query for similar submissions (exclude self)
    query_embedding = _cheap_text_embedding(content)
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5,
            where={"submission_id": {"$ne": str(submission_id)}},
        )
    except Exception:
        # Fallback without where filter
        results = collection.query(query_embeddings=[query_embedding], n_results=6)

    matches = []
    if results and results.get("distances") and results["distances"][0]:
        for i, distance in enumerate(results["distances"][0]):
            similarity = 1.0 - distance  # cosine distance → similarity
            if similarity >= PLAGIARISM_THRESHOLD:
                meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                matches.append({
                    "matched_submission_id": meta.get("submission_id", "unknown"),
                    "student_id": meta.get("student_id", "unknown"),
                    "similarity": round(similarity, 4),
                })

    return {
        "plagiarism_detected": len(matches) > 0,
        "threshold": PLAGIARISM_THRESHOLD,
        "matches": matches,
    }


@router.post("/submissions/{submission_id}/embed")
def embed_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Index a submission into ChromaDB for future plagiarism checks.
    Called automatically after submission or manually by faculty.
    """
    submission = (
        db.query(LmsSubmission)
        .filter(LmsSubmission.sub_id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Prefer textual content if present; otherwise fall back to file reference text.
    content = getattr(submission, "content", None) or submission.file_ref_id or ""
    if not content.strip():
        return MessageResponse(message="No content to embed")

    collection = _get_submissions_collection()
    if collection is None:
        raise HTTPException(status_code=503, detail="ChromaDB unavailable")

    doc_id = f"submission_{submission_id}"
    metadata = {
        "submission_id": str(submission_id),
        "student_id": str(submission.student_id),
        "assignment_id": str(submission.assignment_id),
        "submitted_at": str(submission.submitted_at) if submission.submitted_at else "",
    }

    try:
        collection.upsert(
            ids=[doc_id],
            embeddings=[_cheap_text_embedding(content)],
            documents=[content],
            metadatas=[metadata],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to embed: {exc}")

    return MessageResponse(message=f"Submission {submission_id} embedded for plagiarism detection")
