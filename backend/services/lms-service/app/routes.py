from datetime import datetime, time
from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, or_
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
)
from app.schemas import (
    AssignmentCreate,
    AutoScheduleOut,
    AutoScheduleRequest,
    AutoScheduledSlotOut,
    AssignmentOut,
    AssignmentUpdate,
    AttendanceOut,
    CourseCreate,
    CourseOut,
    CourseMaterialCreate,
    CourseMaterialOut,
    FeedbackSurveyCreate,
    FeedbackSurveyOut,
    FeedbackSummary,
    GradeSubmission,
    GradeSubmitRequest,
    MessageResponse,
    QuizAttempt,
    QuizCreate,
    QuizOut,
    SectionCreate,
    SectionOut,
    SubmissionCreate,
    SubmissionOut,
    TimetableSlotCreate,
    TimetableConstraintCheckOut,
    TimetableConstraintCheckRequest,
    TimetableConstraintViolation,
    TimetableSlotOut,
)

router = APIRouter(prefix="/lms", tags=["LMS"])


def _resolve_student_id(db: Session, user_id: str) -> int:
    """Resolve the integer student_id from a UUID user_id."""
    student = db.query(SisStudent).filter(SisStudent.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    return student.student_id


def _times_overlap(start_a: time, end_a: time, start_b: time, end_b: time) -> bool:
    return start_a < end_b and start_b < end_a


# ── Courses ───────────────────────────────────────────────────────────────

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


@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    course = db.query(LmsCourse).filter(LmsCourse.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    allowed_fields = {"dept_id", "code", "title", "credit_hours", "description", "cover_image"}
    for field, value in payload.items():
        if field in allowed_fields:
            setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


@router.get("/courses/my-courses", response_model=List[SectionOut])
def my_courses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Resolve the integer faculty_id from the UUID user_id
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == current_user["user_id"])
        .first()
    )
    if not faculty:
        return []
    sections = (
        db.query(LmsSection)
        .filter(LmsSection.faculty_id == faculty.faculty_id)
        .all()
    )
    return sections


@router.delete("/courses/{course_id}", response_model=MessageResponse)
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


# ── Sections ──────────────────────────────────────────────────────────────

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


# ── Assignments ───────────────────────────────────────────────────────────

@router.get("/assignments/faculty/me", response_model=List[AssignmentOut])
def my_assignments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all assignments for the authenticated faculty member across all sections."""
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == current_user["user_id"])
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
        .filter(SisStudent.user_id == current_user["user_id"])
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


@router.get("/submissions/me", response_model=List[SubmissionOut])
def my_submissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return all submissions for the authenticated student."""
    student_id = _resolve_student_id(db, current_user["user_id"])
    return (
        db.query(LmsSubmission)
        .filter(LmsSubmission.student_id == student_id)
        .order_by(LmsSubmission.submitted_at.desc())
        .all()
    )


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
        .filter(SisFaculty.user_id == current_user["user_id"])
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


@router.get("/quizzes/section/{section_id}", response_model=List[QuizOut])
def section_quizzes(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(LmsQuiz).filter(LmsQuiz.section_id == section_id).all()


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

    db.query(LmsQuestion).filter(LmsQuestion.quiz_id == quiz_id).delete()
    db.query(LmsAnswer).filter(LmsAnswer.quiz_id == quiz_id).delete()
    db.delete(quiz)
    db.commit()
    return MessageResponse(message="Quiz deleted successfully")


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
        .filter(SisFaculty.user_id == current_user["user_id"])
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


@router.post("/materials/{course_id}")
def upload_course_material_compat(
    course_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    material_type: Optional[str] = Form("document"),
    file_url: Optional[str] = Form(None),
    file_ref_id: Optional[str] = Form(None),
    uploaded_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    """Frontend compatibility alias for multipart material upload."""
    effective_ref = file_ref_id or file_url
    if uploaded_file is not None and uploaded_file.filename:
        effective_ref = effective_ref or uploaded_file.filename

    payload = CourseMaterialCreate(
        course_id=course_id,
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


@router.delete("/materials/{material_id}", response_model=MessageResponse)
def delete_course_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    """Delete a course material."""
    material = (
        db.query(LmsCourseMaterial)
        .filter(LmsCourseMaterial.material_id == material_id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(material)
    db.commit()
    return MessageResponse(message="Material deleted successfully")


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
        .filter(SisStudent.user_id == current_user["user_id"])
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
        .filter(LmsSubmission.submission_id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    content = submission.content or ""
    if not content.strip():
        return {"plagiarism_detected": False, "message": "No content to check"}

    collection = _get_submissions_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            detail="ChromaDB is not reachable. Plagiarism check unavailable.",
        )

    # Query for similar submissions (exclude self)
    try:
        results = collection.query(
            query_texts=[content],
            n_results=5,
            where={"submission_id": {"$ne": str(submission_id)}},
        )
    except Exception:
        # Fallback without where filter
        results = collection.query(query_texts=[content], n_results=6)

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
        .filter(LmsSubmission.submission_id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    content = submission.content or ""
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
            documents=[content],
            metadatas=[metadata],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to embed: {exc}")

    return MessageResponse(message=f"Submission {submission_id} embedded for plagiarism detection")
