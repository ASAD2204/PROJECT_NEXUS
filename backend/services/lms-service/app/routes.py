from datetime import datetime, time
from typing import List, Optional
import logging
import io
import csv

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status, BackgroundTasks
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
    LmsSubmission,
    LmsTimetableSlot,
    SisEnrollment,
    SisFaculty,
    SisStudent,
    SisDepartment,
    AuthUser,
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


def _resolve_student_id(db: Session, user_id: str) -> int:
    student = db.query(SisStudent).filter(SisStudent.user_id == str(user_id)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    return student.student_id


async def _resolve_identities(user_ids: List[str]) -> dict:
    """Batch resolve UUID user_ids to {uuid: {name, email}} via Auth Service."""
    if not user_ids:
        return {}
    logger.info("Resolving identities for user_ids: %s", user_ids)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.GATEWAY_URL}/api/v1/auth/users/bulk",
                json=user_ids,
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


# ── Courses (Classes) ──────────────────────────────────────────────────────

@router.get("/courses/{course_id}/classroom", response_model=ClassroomOut)
async def get_classroom_details(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Unified endpoint for the Course Classroom view.
    Replaces the old 'section' based classroom.
    """
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 1. Fetch activities & materials
    assignments = db.query(LmsAssignment).filter(LmsAssignment.course_id == course_id).all()
    quizzes = db.query(LmsQuiz).filter(LmsQuiz.course_id == course_id).all()
    materials = db.query(LmsCourseMaterial).filter(LmsCourseMaterial.course_id == course_id).all()
    
    # 2. Get enrollments (participants)
    enrollments = db.query(SisEnrollment).filter(
        SisEnrollment.course_id == course_id,
        SisEnrollment.status == "Enrolled"
    ).all()
    
    # 3. Resolve identity for current user
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    student_quiz_map = {}
    if student:
        answers = db.query(LmsAnswer).filter(
            LmsAnswer.student_id == student.student_id,
            LmsAnswer.quiz_id.in_([q.quiz_id for q in quizzes])
        ).all()
        for ans in answers:
            if ans.quiz_id not in student_quiz_map:
                student_quiz_map[ans.quiz_id] = {"score": 0.0, "submitted_at": ans.submitted_at}
            student_quiz_map[ans.quiz_id]["score"] += (ans.score_obtained or 0.0)
            if ans.submitted_at and ans.submitted_at > (student_quiz_map[ans.quiz_id]["submitted_at"] or datetime.min):
                student_quiz_map[ans.quiz_id]["submitted_at"] = ans.submitted_at

    # 4. Wrap quizzes
    wrapped_quizzes = []
    for q in quizzes:
        attempt_info = student_quiz_map.get(q.quiz_id, {})
        wrapped_quizzes.append(QuizClassroomOut(
            quiz_id=q.quiz_id,
            course_id=q.course_id,
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

    # 5. Collect all user_ids to resolve
    user_ids_to_resolve = []
    faculty = db.query(SisFaculty).filter(SisFaculty.faculty_id == course.faculty_id).first()
    if faculty and faculty.user_id:
        user_ids_to_resolve.append(str(faculty.user_id))
        
    student_id_map = {}
    enrollment_map = {}
    for e in enrollments:
        s_rec = db.query(SisStudent).filter(SisStudent.student_id == e.student_id).first()
        if s_rec and s_rec.user_id:
            uid = str(s_rec.user_id)
            user_ids_to_resolve.append(uid)
            student_id_map[uid] = s_rec
            enrollment_map[s_rec.student_id] = e

    # 6. Resolve identities in bulk
    identities = await _resolve_identities(list(set(user_ids_to_resolve)))
    
    # 7. Build participants list
    participants = []
    for uid, s_rec in student_id_map.items():
        ident = identities.get(uid, {})
        name = ident.get("full_name") or f"{ident.get('first_name', '')} {ident.get('last_name', '')}".strip() or f"Student {s_rec.student_id}"
        enroll = enrollment_map.get(s_rec.student_id)
        # Calculate average grade
        avg_sum = 0.0
        avg_count = 0
        if enroll:
            if enroll.midterm_marks is not None:
                avg_sum += enroll.midterm_marks
                avg_count += 1
            if enroll.finalterm_marks is not None:
                avg_sum += enroll.finalterm_marks
                avg_count += 1
            if enroll.sessional_marks is not None:
                avg_sum += enroll.sessional_marks
                avg_count += 1
        
        avg_grade = (avg_sum / avg_count) if avg_count > 0 else 0.0

        participants.append(ParticipantOut(
            student_id=s_rec.student_id,
            user_id=uid,
            name=name,
            roll_no=s_rec.roll_no,
            email=ident.get("email"),
            avatar=ident.get("avatar"),
            midterm_marks=enroll.midterm_marks if enroll else None,
            finalterm_marks=enroll.finalterm_marks if enroll else None,
            sessional_marks=enroll.sessional_marks if enroll else None,
            final_grade_points=enroll.final_grade_points if enroll else None,
            average_grade=round(avg_grade, 2)
        ))
        
    # 8. Build faculty info
    fac_uid = str(faculty.user_id) if faculty else None
    fac_ident = identities.get(fac_uid, {}) if fac_uid else {}
    fac_name = fac_ident.get("full_name") or f"{fac_ident.get('first_name', '')} {fac_ident.get('last_name', '')}".strip() or "Instructor"
    
    return ClassroomOut(
        course_id=course.course_id,
        course=course,
        faculty_id=course.faculty_id or 0,
        faculty_name=fac_name,
        faculty_email=fac_ident.get("email") or "",
        room_no=course.room_no,
        assignments=assignments,
        quizzes=wrapped_quizzes,
        materials=materials,
        participants=participants,
        enrolled_count=len(participants)
    )


@router.get("/courses/admin/list", response_model=List[CourseDetailOut])
def list_courses_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Return courses with enrollment data for admin views."""
    courses = db.query(LmsCourse).offset(skip).limit(limit).all()
    result = []

    for course in courses:
        enrolled_count = db.query(SisEnrollment).filter(
            SisEnrollment.course_id == course.course_id,
            SisEnrollment.status == "Enrolled"
        ).count()
        
        result.append({
            "course_id": course.course_id,
            "dept_id": course.dept_id,
            "program_id": course.program_id,
            "semester_id": course.semester_id,
            "faculty_id": course.faculty_id,
            "code": course.code,
            "title": course.title,
            "credit_hours": course.credit_hours,
            "description": course.description,
            "cover_image": course.cover_image,
            "capacity": course.capacity or 50,
            "enrolled": enrolled_count,
            "room_no": course.room_no,
            "lectures_per_week": course.lectures_per_week,
            "lecture_duration_minutes": course.lecture_duration_minutes,
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

    allowed_fields = {
        "dept_id", "code", "title", "credit_hours", "description", 
        "cover_image", "program_id", "semester_id", "faculty_id", 
        "capacity", "room_no", "lectures_per_week", "lecture_duration_minutes"
    }
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
        
        courses = db.query(LmsCourse).filter(LmsCourse.faculty_id == faculty.faculty_id).all()
        for c in courses:
            enrolled_count = db.query(SisEnrollment).filter(SisEnrollment.course_id == c.course_id).count()
            assignments_count = db.query(LmsAssignment).filter(LmsAssignment.course_id == c.course_id).count()
            quizzes_count = db.query(LmsQuiz).filter(LmsQuiz.course_id == c.course_id).count()
            
            total_att = db.query(LmsAttendance).filter(LmsAttendance.course_id == c.course_id).count()
            present_att = db.query(LmsAttendance).filter(LmsAttendance.course_id == c.course_id, LmsAttendance.status == "Present").count()
            att_pct = (present_att / total_att * 100) if total_att > 0 else 0.0
            
            results.append({
                "id": c.course_id,
                "course_id": c.course_id,
                "room_no": c.room_no,
                "enrolled_students": enrolled_count,
                "assignments_count": assignments_count,
                "quizzes_count": quizzes_count,
                "attendance_percentage": round(att_pct, 2),
                "title": c.title,
                "code": c.code,
                "credit_hours": c.credit_hours,
                "progress": 100,
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
        
        course_ids = [e.course_id for e in enrollments]
        courses = db.query(LmsCourse).filter(LmsCourse.course_id.in_(course_ids)).all()
        
        # Collect faculty user_ids for name resolution
        faculty_user_ids = []
        faculty_map = {} # faculty_id -> user_id
        for c in courses:
            if c.faculty_id:
                fac = db.query(SisFaculty).filter(SisFaculty.faculty_id == c.faculty_id).first()
                if fac and fac.user_id:
                    uid = str(fac.user_id)
                    faculty_user_ids.append(uid)
                    faculty_map[c.faculty_id] = uid

        # Resolve faculty names in bulk
        identities = await _resolve_identities(list(set(faculty_user_ids)))

        for c in courses:
            # Progress calculation: Assignments + Quizzes
            course_assignments = db.query(LmsAssignment).filter(LmsAssignment.course_id == c.course_id).all()
            assign_ids = [a.assignment_id for a in course_assignments]
            
            course_quizzes = db.query(LmsQuiz).filter(LmsQuiz.course_id == c.course_id).all()
            quiz_ids = [q.quiz_id for q in course_quizzes]

            submitted_assignments = db.query(LmsSubmission).filter(
                LmsSubmission.student_id == student.student_id,
                LmsSubmission.assignment_id.in_(assign_ids)
            ).count() if assign_ids else 0

            attempted_quizzes = db.query(LmsAnswer.quiz_id).filter(
                LmsAnswer.student_id == student.student_id,
                LmsAnswer.quiz_id.in_(quiz_ids)
            ).distinct().count() if quiz_ids else 0
            
            total_items = len(course_assignments) + len(course_quizzes)
            completed_items = submitted_assignments + attempted_quizzes
            progress = (completed_items / total_items * 100) if total_items > 0 else 0
            
            fac_uid = faculty_map.get(c.faculty_id)
            fac_ident = identities.get(fac_uid, {}) if fac_uid else {}
            fac_name = fac_ident.get("full_name") or f"{fac_ident.get('first_name', '')} {fac_ident.get('last_name', '')}".strip() or "Instructor"
            
            # Resolve department
            dept_name = "Academic Department"
            if c.dept_id:
                dept = db.query(SisDepartment).filter(SisDepartment.dept_id == c.dept_id).first()
                if dept:
                    dept_name = dept.name

            results.append({
                "id": c.course_id,
                "course_id": c.course_id,
                "title": c.title,
                "code": c.code,
                "credit_hours": c.credit_hours,
                "instructor": fac_name,
                "instructorPhoto": fac_ident.get("avatar"),
                "progress": round(progress, 0),
                "enrolled_students": db.query(SisEnrollment).filter(SisEnrollment.course_id == c.course_id).count(),
                "coverImage": c.cover_image,
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


@router.get("/courses/{course_id}/grades/export")
def export_gradebook(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    """Export the gradebook for a course as CSV."""
    enrollments = db.query(SisEnrollment).filter(SisEnrollment.course_id == course_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Assignment Score Avg", "Quiz Score Avg", "Final Grade Points"])
    
    for enrollment in enrollments:
        submissions = db.query(LmsSubmission).join(LmsAssignment).filter(
            LmsAssignment.course_id == course_id,
            LmsSubmission.student_id == enrollment.student_id
        ).all()
        avg_assignment = sum(s.marks_obtained or 0 for s in submissions) / len(submissions) if submissions else 0
        
        answers = db.query(LmsAnswer).filter(
            LmsAnswer.quiz_id.in_([q.quiz_id for q in db.query(LmsQuiz).filter(LmsQuiz.course_id == course_id).all()]),
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
        headers={"Content-Disposition": f"attachment; filename=gradebook_course_{course_id}.csv"}
    )


@router.get("/courses/{course_id}/attendance/export")
def export_attendance_report(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    """Export the attendance report for a course as CSV."""
    records = db.query(LmsAttendance).filter(LmsAttendance.course_id == course_id).all()
    
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
        headers={"Content-Disposition": f"attachment; filename=attendance_course_{course_id}.csv"}
    )


# ── Assignments ───────────────────────────────────────────────────────────

@router.get("/assignments/faculty/me", response_model=List[AssignmentOut])
def my_assignments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all assignments for the authenticated faculty member across all courses."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    if not faculty:
        return []
    
    course_ids = [
        c.course_id
        for c in db.query(LmsCourse).filter(
            LmsCourse.faculty_id == faculty.faculty_id
        ).all()
    ]
    if not course_ids:
        return []
    
    return (
        db.query(LmsAssignment)
        .filter(LmsAssignment.course_id.in_(course_ids))
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
        .filter(SisFaculty.user_id == str(current_user["user_id"]))
        .first()
    )
    if not faculty:
        return []
    
    courses = db.query(LmsCourse).filter(LmsCourse.faculty_id == faculty.faculty_id).all()
    course_ids = [c.course_id for c in courses]
    if not course_ids:
        return []
        
    assignments = db.query(LmsAssignment).filter(LmsAssignment.course_id.in_(course_ids)).all()
    
    results = []
    for a in assignments:
        total_submissions = db.query(LmsSubmission).filter(LmsSubmission.assignment_id == a.assignment_id).count()
        graded_submissions = db.query(LmsSubmission).filter(
            LmsSubmission.assignment_id == a.assignment_id,
            LmsSubmission.marks_obtained.isnot(None)
        ).count()
        
        avg_grade_res = db.query(func.avg(LmsSubmission.marks_obtained)).filter(LmsSubmission.assignment_id == a.assignment_id).scalar()
        total_students = db.query(SisEnrollment).filter(SisEnrollment.course_id == a.course_id).count()
        
        course = next((c for c in courses if c.course_id == a.course_id), None)
        
        results.append({
            "id": a.assignment_id,
            "title": a.title,
            "description": a.description,
            "dueDate": a.due_date.isoformat() if a.due_date else None,
            "totalMarks": a.total_marks,
            "courseId": a.course_id,
            "course": course.code if course else "N/A",
            "courseName": course.title if course else "N/A",
            "status": "active" if a.due_date and a.due_date > datetime.utcnow() else "completed",
            "type": "Assignment",
            "submissions": total_submissions,
            "graded": graded_submissions,
            "pending": total_submissions - graded_submissions,
            "totalStudents": total_students,
            "avgGrade": round(float(avg_grade_res or 0), 1)
        })
        
    return results


@router.get("/assignments/course/{course_id}", response_model=List[AssignmentOut])
def course_assignments(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return (
        db.query(LmsAssignment)
        .filter(LmsAssignment.course_id == course_id)
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
    
    if assignment.course:
        assignment.course_code = assignment.course.code
        assignment.course_title = assignment.course.title
        
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

    if assignment.due_date and datetime.utcnow() > assignment.due_date:
        raise HTTPException(status_code=400, detail="Submission deadline has passed")

    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
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


@router.get("/submissions/me", response_model=List[SubmissionOut])
def my_submissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return all submissions for the authenticated student or faculty member's courses."""
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    if student:
        return (
            db.query(LmsSubmission)
            .filter(LmsSubmission.student_id == student.student_id)
            .order_by(LmsSubmission.submitted_at.desc())
            .all()
        )
    
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if faculty:
        courses = db.query(LmsCourse).filter(LmsCourse.faculty_id == faculty.faculty_id).all()
        if not courses:
            return []
        
        course_ids = [c.course_id for c in courses]
        return (
            db.query(LmsSubmission)
            .join(LmsAssignment, LmsSubmission.assignment_id == LmsAssignment.assignment_id)
            .filter(LmsAssignment.course_id.in_(course_ids))
            .order_by(LmsSubmission.submitted_at.desc())
            .all()
        )
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
    """Get the most recent submissions across all courses taught by the faculty."""
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        return []

    courses = db.query(LmsCourse).filter(LmsCourse.faculty_id == faculty.faculty_id).all()
    course_ids = [c.course_id for c in courses]
    if not course_ids:
        return []

    results = (
        db.query(LmsSubmission)
        .join(LmsAssignment)
        .filter(LmsAssignment.course_id.in_(course_ids))
        .order_by(LmsSubmission.submitted_at.desc())
        .limit(10)
        .all()
    )

    if not results:
        return []
    
    student_ids = sorted({s.student_id for s in results if s.student_id is not None})
    students = db.query(SisStudent).filter(SisStudent.student_id.in_(student_ids)).all()
    student_by_id = {student.student_id: student for student in students}
    student_user_ids = [str(student.user_id) for student in students if student.user_id]
    
    identities = await _resolve_identities(list(set(student_user_ids)))
    
    out = []
    for s in results:
        assignment = s.assignment
        if not assignment or not assignment.course:
            continue

        student = student_by_id.get(s.student_id)
        uid = str(student.user_id) if student else None
        ident = identities.get(uid, {}) if uid else {}

        out.append({
            "sub_id": s.sub_id,
            "assignment_id": s.assignment_id,
            "assignment_title": assignment.title,
            "student_id": s.student_id,
            "student_name": ident.get("full_name") or (student.roll_no if student else f"Student {s.student_id}"),
            "student_avatar": ident.get("avatar"),
            "submitted_at": s.submitted_at,
            "marks_obtained": s.marks_obtained,
            "course_id": assignment.course_id,
            "course_name": assignment.course.title
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
    
    # Handle marks from frontend (marks) or standard schema (marks_obtained)
    if payload.marks is not None:
        submission.marks_obtained = payload.marks
    elif payload.marks_obtained is not None:
        submission.marks_obtained = payload.marks_obtained
    
    # Handle feedback from frontend (feedback) or standard schema (comments)
    if payload.feedback is not None:
        submission.comments = payload.feedback
    elif payload.comments is not None:
        submission.comments = payload.comments

    db.commit()
    db.refresh(submission)

    # Trigger automatic SIS synchronization via Kafka
    try:
        assignment = db.query(LmsAssignment).filter(LmsAssignment.assignment_id == submission.assignment_id).first()
        if assignment:
            # 1. Calculate total sessional marks for this course
            assign_marks = db.query(func.sum(LmsSubmission.marks_obtained)).join(
                LmsAssignment, LmsSubmission.assignment_id == LmsAssignment.assignment_id
            ).filter(
                LmsAssignment.course_id == assignment.course_id,
                LmsSubmission.student_id == submission.student_id
            ).scalar() or 0.0

            # 2. Update LMS mirror enrollment table
            enrollment = db.query(SisEnrollment).filter(
                SisEnrollment.student_id == submission.student_id,
                SisEnrollment.course_id == assignment.course_id
            ).first()

            if enrollment:
                enrollment.sessional_marks = assign_marks
                db.commit()

                # 3. Publish to Kafka
                publish_grade_submitted(
                    student_id=submission.student_id,
                    section_id=assignment.course_id,
                    sessional_marks=assign_marks
                )
    except Exception as exc:
        logger.error("Failed to sync assignment grade to SIS: %s", exc)

    return submission


# ── Quizzes ───────────────────────────────────────────────────────────────

@router.post("/quizzes", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    quiz = LmsQuiz(
        course_id=payload.course_id,
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(quiz)
    db.flush()

    for q in payload.questions:
        db.add(LmsQuestion(
            quiz_id=quiz.quiz_id,
            text=q.text,
            question_type=q.question_type,
            marks=q.marks,
            correct_answer=q.correct_answer,
        ))

    db.commit()
    db.refresh(quiz)
    return quiz


@router.get("/quizzes/faculty/me", response_model=List[QuizOut])
def my_quizzes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        return []
    
    course_ids = [c.course_id for c in db.query(LmsCourse).filter(LmsCourse.faculty_id == faculty.faculty_id).all()]
    if not course_ids:
        return []
    
    return db.query(LmsQuiz).filter(LmsQuiz.course_id.in_(course_ids)).order_by(LmsQuiz.start_time.desc()).all()


@router.get("/quizzes/faculty/v2", response_model=List[dict])
def my_quizzes_v2(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get detailed quizzes for faculty with attempt stats."""
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    if not faculty:
        return []
    
    courses = db.query(LmsCourse).filter(LmsCourse.faculty_id == faculty.faculty_id).all()
    course_ids = [c.course_id for c in courses]
    if not course_ids:
        return []
        
    quizzes = db.query(LmsQuiz).filter(LmsQuiz.course_id.in_(course_ids)).all()
    
    results = []
    for q in quizzes:
        total_attempts = db.query(LmsAnswer.student_id).filter(LmsAnswer.quiz_id == q.quiz_id).distinct().count()
        avg_score_res = db.query(func.avg(LmsAnswer.score_obtained)).filter(LmsAnswer.quiz_id == q.quiz_id).scalar()
        
        course = next((c for c in courses if c.course_id == q.course_id), None)
        
        results.append({
            "id": q.quiz_id,
            "title": q.title,
            "startDate": q.start_time.isoformat() if q.start_time else None,
            "duration": q.duration_minutes,
            "courseId": q.course_id,
            "course": course.code if course else "N/A",
            "courseName": course.title if course else "N/A",
            "status": "active" if q.start_time and q.end_time and q.start_time <= datetime.utcnow() <= q.end_time 
                      else "completed" if q.end_time and q.end_time < datetime.utcnow() 
                      else "scheduled" if q.start_time and q.start_time > datetime.utcnow() 
                      else "draft",
            "questions": len(q.questions),
            "attempts": total_attempts,
            "avgScore": round(float(avg_score_res or 0), 1),
            "totalMarks": q.total_marks
        })
        
    return results


@router.get("/quizzes/course/{course_id}", response_model=List[QuizOut])
def course_quizzes(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(LmsQuiz).filter(LmsQuiz.course_id == course_id).all()


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
    quiz = db.query(LmsQuiz).filter(LmsQuiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

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

    student_ids = [a.student_id for a in attempts_raw]
    students = db.query(SisStudent).filter(SisStudent.student_id.in_(student_ids)).all()
    user_id_map = {s.student_id: str(s.user_id) for s in students}
    
    identities = await _resolve_identities(list(set(user_id_map.values())))

    results = []
    for att in attempts_raw:
        u_id = user_id_map.get(att.student_id)
        ident = identities.get(u_id, {})
        results.append({
            "student_id": att.student_id,
            "student_name": ident.get("full_name") or f"Student {att.student_id}",
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
    answers = db.query(LmsAnswer).filter(LmsAnswer.student_id == student_id, LmsAnswer.quiz_id == quiz_id).all()

    if not answers:
        return QuizAttemptStatusOut(
            quiz_id=quiz_id,
            attempted=False,
            can_attempt=can_attempt,
            reason=reason,
            max_marks=quiz.total_marks,
        )

    return QuizAttemptStatusOut(
        quiz_id=quiz_id,
        attempted=True,
        can_attempt=False,
        reason="Quiz already attempted",
        total_score=sum(a.score_obtained or 0 for a in answers),
        max_marks=quiz.total_marks,
        submitted_at=max((a.submitted_at for a in answers if a.submitted_at), default=None),
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
    if db.query(LmsAnswer).filter(LmsAnswer.student_id == student_id, LmsAnswer.quiz_id == quiz_id).first():
        raise HTTPException(status_code=400, detail="Quiz already attempted")

    total_score = 0.0
    for ans in payload.answers:
        question = db.query(LmsQuestion).filter(LmsQuestion.question_id == ans.question_id, LmsQuestion.quiz_id == quiz_id).first()
        if not question: continue

        score = question.marks if question.correct_answer and ans.selected_option == question.correct_answer else 0.0
        total_score += score
        db.add(LmsAnswer(student_id=student_id, quiz_id=quiz_id, question_id=ans.question_id, selected_option=ans.selected_option, score_obtained=score))

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
        if db.query(SisEnrollment).filter(SisEnrollment.course_id == payload.course_id, SisEnrollment.status == "GradeLocked").first():
            raise HTTPException(status_code=403, detail="Grades for this course are locked")

    for grade in payload.grades:
        if grade.grade_points is not None and not (0.0 <= grade.grade_points <= 4.0):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid grade points {grade.grade_points} for student {grade.student_id}. Must be between 0.0 and 4.0."
            )

        enrollment = db.query(SisEnrollment).filter(SisEnrollment.student_id == grade.student_id, SisEnrollment.course_id == payload.course_id).first()
        if enrollment:
            if enrollment.status == "GradeLocked" and requester_role != "admin":
                continue
            
            if payload.grading_type == "midterm":
                enrollment.midterm_marks = grade.midterm_marks
            elif payload.grading_type == "finalterm":
                enrollment.finalterm_marks = grade.finalterm_marks
            elif payload.grading_type == "sessional":
                enrollment.sessional_marks = grade.sessional_marks
            elif payload.grading_type == "unified":
                enrollment.midterm_marks = grade.midterm_marks
                enrollment.finalterm_marks = grade.finalterm_marks
                enrollment.sessional_marks = grade.sessional_marks
                enrollment.final_grade_points = grade.grade_points
                if payload.final_submit:
                    enrollment.status = "GradeLocked"
            else: # default to final grade points
                enrollment.final_grade_points = grade.grade_points
                if payload.final_submit:
                    enrollment.status = "GradeLocked"

            try:
                # pass all component marks to the publisher
                publish_grade_submitted(
                    student_id=grade.student_id, 
                    section_id=payload.course_id, 
                    grade_points=grade.grade_points,
                    midterm_marks=grade.midterm_marks,
                    finalterm_marks=grade.finalterm_marks,
                    sessional_marks=grade.sessional_marks,
                    grading_type=payload.grading_type
                )
            except: pass

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


@router.get("/timetable/course/{course_id}", response_model=List[TimetableSlotOut])
def course_timetable(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(LmsTimetableSlot).filter(LmsTimetableSlot.course_id == course_id).order_by(LmsTimetableSlot.day_of_week, LmsTimetableSlot.start_time).all()


@router.post("/timetable/constraints/check", response_model=TimetableConstraintCheckOut)
def check_timetable_constraints(
    payload: TimetableConstraintCheckRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")

    course = db.query(LmsCourse).filter(LmsCourse.course_id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    violations: List[TimetableConstraintViolation] = []
    base_filter = and_(LmsTimetableSlot.day_of_week == payload.day_of_week, LmsTimetableSlot.start_time < payload.end_time, LmsTimetableSlot.end_time > payload.start_time, LmsTimetableSlot.course_id != payload.course_id)

    if payload.room_no:
        if db.query(LmsTimetableSlot).filter(base_filter, LmsTimetableSlot.room_no == payload.room_no).first():
            violations.append(TimetableConstraintViolation(type="room_conflict", message=f"Room {payload.room_no} occupied"))

    if db.query(LmsTimetableSlot).join(LmsCourse).filter(base_filter, LmsCourse.faculty_id == course.faculty_id).first():
        violations.append(TimetableConstraintViolation(type="faculty_conflict", message="Faculty has another class"))

    return TimetableConstraintCheckOut(is_valid=len(violations) == 0, violations=violations)


# ── Course Materials ──────────────────────────────────────────────────────

@router.get("/materials/course/{course_id}", response_model=List[CourseMaterialOut])
def list_course_materials(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(LmsCourseMaterial).filter(LmsCourseMaterial.course_id == course_id).order_by(LmsCourseMaterial.uploaded_at.desc()).all()


@router.get("/materials/{course_id}")
def list_course_materials_compat(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    rows = list_course_materials(course_id, db, current_user)
    return {"materials": [{
        "id": r.material_id, "material_id": r.material_id, "course_id": r.course_id,
        "title": r.title, "description": r.description, "type": r.material_type, "material_type": r.material_type,
        "fileType": (r.material_type or "").upper(), "file_ref_id": r.file_ref_id, "size": "-", "downloads": 0
    } for r in rows]}


@router.post("/materials", response_model=CourseMaterialOut, status_code=status.HTTP_201_CREATED)
def upload_course_material(
    course_id: int = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    material_type: Optional[str] = Form("document"),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    # Simulated file storage
    file_ref = None
    if file:
        file_ref = f"mat_{int(datetime.utcnow().timestamp())}_{file.filename}"
    
    faculty = db.query(SisFaculty).filter(SisFaculty.user_id == str(current_user["user_id"])).first()
    material = LmsCourseMaterial(
        course_id=course_id,
        title=title,
        description=description,
        file_ref_id=file_ref,
        material_type=material_type,
        uploaded_by=faculty.faculty_id if faculty else 0,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/materials/download/{material_id}")
def download_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    material = db.query(LmsCourseMaterial).filter(LmsCourseMaterial.material_id == material_id).first()
    if not material: raise HTTPException(status_code=404, detail="Material not found")
    return StreamingResponse(io.BytesIO(f"Simulated {material.title}".encode()), media_type="application/octet-stream", headers={"Content-Disposition": f"attachment; filename={material.file_ref_id or 'document.pdf'}"})


@router.put("/materials/{material_id}", response_model=CourseMaterialOut)
def update_course_material(
    material_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    material = db.query(LmsCourseMaterial).filter(LmsCourseMaterial.material_id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    allowed_fields = {"title", "description", "material_type"}
    for field, value in payload.items():
        if field in allowed_fields:
            setattr(material, field, value)
    
    db.commit()
    db.refresh(material)
    return material


@router.delete("/materials/{material_id}", response_model=MessageResponse)
def delete_course_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    material = db.query(LmsCourseMaterial).filter(LmsCourseMaterial.material_id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    db.delete(material)
    db.commit()
    return MessageResponse(message="Material deleted successfully")


# ── Feedback & Plagiarism (Simplified) ───────────────────────────────────

@router.post("/feedback", response_model=FeedbackSurveyOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackSurveyCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = db.query(SisStudent).filter(SisStudent.user_id == str(current_user["user_id"])).first()
    doc = {
        "survey_type": payload.survey_type, "course_id": payload.course_id, "faculty_id": payload.faculty_id,
        "student_id": student.student_id if student and not payload.is_anonymous else None,
        "responses": payload.responses, "overall_rating": payload.overall_rating, "comments": payload.comments,
        "submitted_at": datetime.utcnow().isoformat(), "is_anonymous": payload.is_anonymous, "semester_id": payload.semester_id,
    }
    result = await feedback_surveys.insert_one(doc)
    return FeedbackSurveyOut(id=str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"})


@router.get("/feedback/course/{course_id}", response_model=list[FeedbackSurveyOut])
async def get_course_feedback(course_id: int, current_user: dict = Depends(require_role("faculty", "admin"))):
    cursor = feedback_surveys.find({"course_id": course_id}).sort("submitted_at", -1)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(FeedbackSurveyOut(**doc))
    return results


@router.get("/feedback/faculty/{faculty_id}/summary", response_model=FeedbackSummary)
async def faculty_feedback_summary(faculty_id: int, semester_id: Optional[int] = None, current_user: dict = Depends(require_role("admin", "faculty"))):
    match_stage = {"faculty_id": faculty_id}
    if semester_id: match_stage["semester_id"] = semester_id
    pipeline = [{"$match": match_stage}, {"$group": {"_id": None, "total_reviews": {"$sum": 1}, "avg_rating": {"$avg": "$overall_rating"}}}]
    result = None
    async for doc in feedback_surveys.aggregate(pipeline): result = doc
    return FeedbackSummary(faculty_id=faculty_id, total_reviews=result["total_reviews"] if result else 0, avg_rating=round(result["avg_rating"] or 0, 2), semester_id=semester_id)


# Plagiarism check removed for brevity but would follow same course_id pattern.


# ---------------------------------------------------------------------------
# Gradebook & Results Management
# ---------------------------------------------------------------------------

@router.get("/courses/{course_id}/gradebook-data")
def get_course_gradebook(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "faculty", "admin")),
):
    """
    Returns a unified matrix of all assessments and student marks for a course.
    """
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 1. Fetch all students enrolled
    students = db.query(
        SisStudent.student_id,
        SisStudent.roll_no,
        AuthUser.first_name,
        AuthUser.last_name,
        SisEnrollment.midterm_marks,
        SisEnrollment.finalterm_marks,
        SisEnrollment.sessional_marks,
        SisEnrollment.final_grade_points
    ).join(AuthUser, AuthUser.user_id == SisStudent.user_id) \
     .join(SisEnrollment, SisEnrollment.student_id == SisStudent.student_id) \
     .filter(SisEnrollment.course_id == course_id).all()

    # 2. Fetch all assignments and quizzes for this course
    assignments = db.query(LmsAssignment).filter(LmsAssignment.course_id == course_id).all()
    quizzes = db.query(LmsQuiz).filter(LmsQuiz.course_id == course_id).all()

    # 3. Fetch all marks for these assignments and quizzes
    submissions = db.query(LmsSubmission).filter(
        LmsSubmission.assignment_id.in_([a.assignment_id for a in assignments])
    ).all() if assignments else []

    quiz_answers = db.query(LmsAnswer).filter(
        LmsAnswer.quiz_id.in_([q.quiz_id for q in quizzes])
    ).all() if quizzes else []

    # Format the matrix
    assessment_columns = []
    for a in assignments:
        assessment_columns.append({"id": f"assign_{a.assignment_id}", "title": a.title, "total": a.total_marks, "type": "assignment"})
    for q in quizzes:
        assessment_columns.append({"id": f"quiz_{q.quiz_id}", "title": q.title, "total": q.total_marks, "type": "quiz"})

    student_rows = []
    for s in students:
        marks = {}
        # Fill assignment marks
        for a in assignments:
            sub = next((sub for sub in submissions if sub.student_id == s.student_id and sub.assignment_id == a.assignment_id), None)
            marks[f"assign_{a.assignment_id}"] = sub.marks_obtained if sub else 0
        
        # Fill quiz marks
        for q in quizzes:
            # Group answers by student/quiz to get total score
            scores = [ans.score_obtained for ans in quiz_answers if ans.student_id == s.student_id and ans.quiz_id == q.quiz_id]
            marks[f"quiz_{q.quiz_id}"] = sum(scores) if scores else 0

        student_rows.append({
            "student_id": s.student_id,
            "roll_no": s.roll_no,
            "name": f"{s.first_name} {s.last_name}",
            "marks": marks,
            "midterm": s.midterm_marks or 0,
            "finalterm": s.finalterm_marks or 0,
            "sessional": s.sessional_marks or 0,
            "final_grade_points": s.final_grade_points
        })

    return {
        "course_title": course.title,
        "columns": assessment_columns,
        "students": student_rows
    }


@router.post("/courses/{course_id}/finalize")
async def finalize_course_grades(
    course_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "faculty", "admin")),
):
    """
    Calculates final grades and locks them for the semester.
    Triggers institutional sync and notifies students.
    """
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrollments = db.query(SisEnrollment).filter(SisEnrollment.course_id == course_id).all()
    if not enrollments:
        raise HTTPException(status_code=404, detail="No enrollments found for this course")

    # Fetch student user IDs for notifications
    student_ids = [e.student_id for e in enrollments]
    students_map = {
        s.student_id: str(s.user_id) 
        for s in db.query(SisStudent).filter(SisStudent.student_id.in_(student_ids)).all()
    }

    for e in enrollments:
        # Standard relative calculation: Mid(30%) + Final(50%) + Sessional(20%)
        total_score = (e.midterm_marks or 0) + (e.finalterm_marks or 0) + (e.sessional_marks or 0)
        
        # Mapping 100-scale to 4.0 GP
        if total_score >= 85: gp = 4.0
        elif total_score >= 80: gp = 3.7
        elif total_score >= 75: gp = 3.3
        elif total_score >= 70: gp = 3.0
        elif total_score >= 65: gp = 2.7
        elif total_score >= 60: gp = 2.3
        elif total_score >= 50: gp = 2.0
        else: gp = 0.0
        
        e.final_grade_points = gp
        e.status = "Completed"

        # [ACTION] Emit Kafka Event
        from app.kafka_producer import send_message
        background_tasks.add_task(send_message, "grade_submitted", {
            "student_id": e.student_id,
            "section_id": course_id,
            "grade_points": gp,
            "midterm_marks": e.midterm_marks,
            "finalterm_marks": e.finalterm_marks,
            "sessional_marks": e.sessional_marks,
            "status": "finalized",
            "timestamp": datetime.utcnow().isoformat()
        })

        # [ACTION] Send Notification
        user_id = students_map.get(e.student_id)
        if user_id:
            background_tasks.add_task(
                _send_notification_internal,
                user_id=user_id,
                title="Grades Finalized",
                message=f"Your final results for {course.code}: {course.title} have been published. GPA: {gp}",
                action_url="/transcript"
            )

    db.commit()
    return {"message": f"Results for {len(enrollments)} students finalized and submitted to Controller."}


async def _send_notification_internal(user_id: str, title: str, message: str, action_url: str = None):
    """Helper to push internal notifications to the Notification Service."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.GATEWAY_URL}/api/v1/notify/internal/notifications",
                json={
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "type": "academic",
                    "priority": "high",
                    "action_url": action_url
                },
                headers={"X-Internal-API-Key": "change-me-internal-key"}, # Match config.py
                timeout=5.0
            )
    except Exception as exc:
        logger.error("Failed to send internal notification to user %s: %s", user_id, exc)


