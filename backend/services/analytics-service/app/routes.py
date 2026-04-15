from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db, analytics_events
from app.dependencies import get_current_user, require_role
from app.ml_model import predict_risk, train_model
from app.models import (
    FinInvoice,
    FinTransaction,
    LmsAnswer,
    LmsAssignment,
    LmsAttendance,
    LmsCourse,
    LmsQuiz,
    LmsSection,
    LmsSubmission,
    SisEnrollment,
    SisFaculty,
    SisStudent,
    SisTranscript,
)
from app.schemas import (
    AdminDashboardResponse,
    AnalyticsEventCreate,
    AnalyticsEventOut,
    AttendanceKPI,
    EventCountSummary,
    FacultyDashboardResponse,
    MessageResponse,
    RevenueKPI,
    SectionAtRiskResponse,
    SectionPerformanceSummary,
    StudentDashboardResponse,
    StudentRiskFeatures,
    StudentRiskResponse,
    TrainModelRequest,
    TrainModelResponse,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _student_display_name(student) -> str:
    """Build a display name from the related auth_users row or fall back to roll_no."""
    if student.user and (student.user.first_name or student.user.last_name):
        return f"{student.user.first_name or ''} {student.user.last_name or ''}".strip()
    return student.roll_no or f"Student #{student.student_id}"


def _student_cgpa(db: Session, student_id: int) -> float:
    """Get the latest CGPA from sis_transcripts for a student."""
    transcript = (
        db.query(SisTranscript)
        .filter(SisTranscript.student_id == student_id)
        .order_by(SisTranscript.generated_at.desc())
        .first()
    )
    return float(transcript.cgpa) if transcript and transcript.cgpa else 0.0


def _compute_student_features(db: Session, student_id: int, section_id: int = None):
    """Compute risk features for a student, optionally scoped to a section."""
    # Attendance percentage
    att_query = db.query(LmsAttendance).filter(LmsAttendance.student_id == student_id)
    if section_id:
        att_query = att_query.filter(LmsAttendance.section_id == section_id)
    total_att = att_query.count()
    present_att = att_query.filter(LmsAttendance.status == "Present").count()
    attendance_pct = (present_att / total_att * 100) if total_att > 0 else 100.0

    # Average quiz score
    quiz_query = db.query(LmsAnswer).filter(LmsAnswer.student_id == student_id)
    if section_id:
        quiz_query = quiz_query.join(LmsQuiz).filter(LmsQuiz.section_id == section_id)
    quiz_result = quiz_query.with_entities(
        func.avg(LmsAnswer.score_obtained)
    ).scalar()
    avg_quiz_score = float(quiz_result) if quiz_result else 0.0

    # Assignment submission rate
    if section_id:
        total_assignments = (
            db.query(LmsAssignment)
            .filter(LmsAssignment.section_id == section_id)
            .count()
        )
        submitted = (
            db.query(LmsSubmission)
            .join(LmsAssignment)
            .filter(
                LmsSubmission.student_id == student_id,
                LmsAssignment.section_id == section_id,
            )
            .count()
        )
    else:
        total_assignments = db.query(LmsAssignment).count()
        submitted = (
            db.query(LmsSubmission)
            .filter(LmsSubmission.student_id == student_id)
            .count()
        )
    submission_rate = (submitted / total_assignments * 100) if total_assignments > 0 else 100.0

    # CGPA from latest transcript
    cgpa = _student_cgpa(db, student_id)

    return StudentRiskFeatures(
        attendance_pct=round(attendance_pct, 2),
        avg_quiz_score=round(avg_quiz_score, 2),
        assignment_submission_rate=round(submission_rate, 2),
        cgpa=round(cgpa, 2),
    )


# ── At-Risk ───────────────────────────────────────────────────────────────

@router.get("/at-risk/section/{section_id}", response_model=SectionAtRiskResponse)
async def at_risk_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    section = db.query(LmsSection).filter(LmsSection.section_id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Resolve course name via relationship
    course_name = section.course.title if section.course else None

    enrollments = (
        db.query(SisEnrollment)
        .filter(SisEnrollment.section_id == section_id)
        .all()
    )

    students_risk = []
    red = yellow = green = 0

    for enrollment in enrollments:
        student = (
            db.query(SisStudent)
            .filter(SisStudent.student_id == enrollment.student_id)
            .first()
        )
        if not student:
            continue

        features = _compute_student_features(db, student.student_id, section_id)
        risk_level = predict_risk(
            features.attendance_pct,
            features.avg_quiz_score,
            features.assignment_submission_rate,
            features.cgpa,
        )

        if risk_level == "Red":
            red += 1
        elif risk_level == "Yellow":
            yellow += 1
        else:
            green += 1

        students_risk.append(
            StudentRiskResponse(
                student_id=student.student_id,
                student_name=_student_display_name(student),
                risk_level=risk_level,
                features=features,
            )
        )

    return SectionAtRiskResponse(
        section_id=section_id,
        course_name=course_name,
        total_students=len(students_risk),
        red_count=red,
        yellow_count=yellow,
        green_count=green,
        students=students_risk,
    )


# ── Admin Dashboard ───────────────────────────────────────────────────────

@router.get("/dashboard/admin", response_model=AdminDashboardResponse)
async def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    total_students = db.query(SisStudent).count()
    # All rows are "active" students (no status column — deactivation is via auth_users.is_active)
    active_students = total_students
    total_sections = db.query(LmsSection).count()

    # Attendance KPIs (title-case status values)
    total_att = db.query(LmsAttendance).count()
    present_att = (
        db.query(LmsAttendance).filter(LmsAttendance.status == "Present").count()
    )
    att_pct = (present_att / total_att * 100) if total_att > 0 else 0.0

    # Revenue KPIs
    total_invoiced = float(
        db.query(func.sum(FinInvoice.total_amount)).scalar() or 0
    )
    total_collected = float(
        db.query(func.sum(FinTransaction.amount_paid)).scalar() or 0
    )
    collection_rate = (
        (total_collected / total_invoiced * 100) if total_invoiced > 0 else 0.0
    )

    # At-risk summary based on current_risk_status
    red_count = (
        db.query(SisStudent).filter(SisStudent.current_risk_status == "Red").count()
    )
    yellow_count = (
        db.query(SisStudent).filter(SisStudent.current_risk_status == "Yellow").count()
    )
    green_count = (
        db.query(SisStudent).filter(SisStudent.current_risk_status == "Green").count()
    )

    # Average CGPA from latest transcripts
    avg_cgpa_result = (
        db.query(func.avg(SisTranscript.cgpa))
        .filter(SisTranscript.cgpa.isnot(None))
        .scalar()
    )
    avg_cgpa = float(avg_cgpa_result) if avg_cgpa_result else 0.0

    return AdminDashboardResponse(
        total_students=total_students,
        active_students=active_students,
        total_sections=total_sections,
        attendance=AttendanceKPI(
            total_records=total_att,
            present_count=present_att,
            attendance_pct=round(att_pct, 2),
        ),
        revenue=RevenueKPI(
            total_invoiced=total_invoiced,
            total_collected=total_collected,
            collection_rate_pct=round(collection_rate, 2),
            outstanding=total_invoiced - total_collected,
        ),
        at_risk_summary={"red": red_count, "yellow": yellow_count, "green": green_count},
        avg_cgpa=round(avg_cgpa, 2),
    )


# ── Faculty Dashboard ────────────────────────────────────────────────────

@router.get("/dashboard/faculty", response_model=FacultyDashboardResponse)
async def faculty_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("faculty")),
):
    user_id = current_user.get("user_id")

    # Resolve faculty_id from UUID user_id
    faculty = (
        db.query(SisFaculty)
        .filter(SisFaculty.user_id == user_id)
        .first()
    )
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty record not found")

    sections = (
        db.query(LmsSection)
        .filter(LmsSection.faculty_id == faculty.faculty_id)
        .all()
    )

    section_summaries = []
    total_students = 0

    for section in sections:
        enrolled = (
            db.query(SisEnrollment)
            .filter(SisEnrollment.section_id == section.section_id)
            .count()
        )
        total_students += enrolled

        # Avg attendance
        total_att = (
            db.query(LmsAttendance)
            .filter(LmsAttendance.section_id == section.section_id)
            .count()
        )
        present_att = (
            db.query(LmsAttendance)
            .filter(
                LmsAttendance.section_id == section.section_id,
                LmsAttendance.status == "Present",
            )
            .count()
        )
        avg_att = (present_att / total_att * 100) if total_att > 0 else 0.0

        # Avg quiz score
        quiz_result = (
            db.query(func.avg(LmsAnswer.score_obtained))
            .join(LmsQuiz)
            .filter(LmsQuiz.section_id == section.section_id)
            .scalar()
        )
        avg_quiz = float(quiz_result) if quiz_result else 0.0

        # Avg assignment score
        assign_result = (
            db.query(func.avg(LmsSubmission.marks_obtained))
            .join(LmsAssignment)
            .filter(LmsAssignment.section_id == section.section_id)
            .scalar()
        )
        avg_assign = float(assign_result) if assign_result else 0.0

        course_name = section.course.title if section.course else None

        section_summaries.append(
            SectionPerformanceSummary(
                section_id=section.section_id,
                course_name=course_name,
                enrolled_students=enrolled,
                avg_attendance_pct=round(avg_att, 2),
                avg_quiz_score=round(avg_quiz, 2),
                avg_assignment_score=round(avg_assign, 2),
                at_risk_count=0,
            )
        )

    return FacultyDashboardResponse(
        faculty_id=faculty.faculty_id,
        total_sections=len(sections),
        total_students=total_students,
        sections=section_summaries,
    )


# ── Student Risk ──────────────────────────────────────────────────────────

@router.get("/student/{student_id}/risk", response_model=StudentRiskResponse)
async def student_risk(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    student = db.query(SisStudent).filter(SisStudent.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    features = _compute_student_features(db, student_id)
    risk_level = predict_risk(
        features.attendance_pct,
        features.avg_quiz_score,
        features.assignment_submission_rate,
        features.cgpa,
    )

    return StudentRiskResponse(
        student_id=student.student_id,
        student_name=_student_display_name(student),
        risk_level=risk_level,
        features=features,
    )


# ── Student Dashboard ────────────────────────────────────────────────────

@router.get("/dashboard/student", response_model=StudentDashboardResponse)
async def student_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Dashboard for the authenticated student."""
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == current_user["user_id"])
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student_id = student.student_id

    # Attendance
    total_att = db.query(LmsAttendance).filter(LmsAttendance.student_id == student_id).count()
    present_att = (
        db.query(LmsAttendance)
        .filter(LmsAttendance.student_id == student_id, LmsAttendance.status == "Present")
        .count()
    )
    attendance_pct = (present_att / total_att * 100) if total_att > 0 else 100.0

    # Quiz scores
    quiz_results = (
        db.query(func.avg(LmsAnswer.score_obtained))
        .filter(LmsAnswer.student_id == student_id)
        .scalar()
    )
    avg_quiz_score = float(quiz_results) if quiz_results else 0.0

    # Courses enrolled
    total_courses = (
        db.query(SisEnrollment)
        .filter(SisEnrollment.student_id == student_id, SisEnrollment.status == "Enrolled")
        .count()
    )

    # Assignments
    enrolled_sections = (
        db.query(SisEnrollment.section_id)
        .filter(SisEnrollment.student_id == student_id, SisEnrollment.status == "Enrolled")
        .subquery()
    )
    total_assignments = (
        db.query(LmsAssignment)
        .filter(LmsAssignment.section_id.in_(db.query(enrolled_sections)))
        .count()
    )
    completed_assignments = (
        db.query(LmsSubmission)
        .filter(LmsSubmission.student_id == student_id)
        .count()
    )
    pending_assignments = max(0, total_assignments - completed_assignments)
    submission_rate = (
        (completed_assignments / total_assignments * 100) if total_assignments > 0 else 100.0
    )

    cgpa = _student_cgpa(db, student_id)

    # Risk
    risk_level = predict_risk(attendance_pct, avg_quiz_score, submission_rate, cgpa)

    return StudentDashboardResponse(
        student_id=student_id,
        attendance_pct=round(attendance_pct, 2),
        avg_quiz_score=round(avg_quiz_score, 2),
        assignment_submission_rate=round(submission_rate, 2),
        cgpa=round(cgpa, 2),
        risk_level=risk_level,
        total_courses=total_courses,
        completed_assignments=completed_assignments,
        pending_assignments=pending_assignments,
    )


# ── Model Training ───────────────────────────────────────────────────────

@router.post("/model/train", response_model=TrainModelResponse)
async def train_risk_model(
    payload: TrainModelRequest,
    current_user: dict = Depends(require_role("admin")),
):
    data = [row.model_dump() for row in payload.training_data]
    result = train_model(data)
    return TrainModelResponse(**result)


# ═══════════════════════════════════════════════════════════════════════════
# ANALYTICS EVENTS  (MongoDB — FYP Table 139)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/events", response_model=AnalyticsEventOut, status_code=201)
async def track_event(
    payload: AnalyticsEventCreate,
    current_user: dict = Depends(get_current_user),
):
    """Track a frontend analytics event (page_view, button_click, etc.)."""
    from datetime import datetime

    doc = {
        "event_type": payload.event_type,
        "user_id": current_user.get("user_id"),
        "session_id": None,
        "page_url": payload.page_url,
        "referrer_url": payload.referrer_url,
        "timestamp": datetime.utcnow().isoformat(),
        "properties": payload.properties,
        "device_info": payload.device_info,
        "geo_location": payload.geo_location,
    }
    result = await analytics_events.insert_one(doc)
    return AnalyticsEventOut(
        id=str(result.inserted_id),
        **{k: v for k, v in doc.items() if k != "_id"},
    )


@router.get("/events", response_model=list[AnalyticsEventOut])
async def list_events(
    event_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(require_role("admin")),
):
    """Query analytics events with optional filters (admin only)."""
    query_filter: dict = {}
    if event_type:
        query_filter["event_type"] = event_type
    if user_id:
        query_filter["user_id"] = user_id

    cursor = analytics_events.find(query_filter).sort("timestamp", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(AnalyticsEventOut(**doc))
    return results


@router.get("/events/summary", response_model=list[EventCountSummary])
async def event_summary(
    current_user: dict = Depends(require_role("admin")),
):
    """Get event type counts via aggregation pipeline."""
    pipeline = [
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = []
    async for doc in analytics_events.aggregate(pipeline):
        results.append(EventCountSummary(event_type=doc["_id"], count=doc["count"]))
    return results
