"""
Kafka consumer for the SIS service.

Listens to the ``grade_submitted`` topic.  When a grade event arrives the
consumer:
  1. Updates ``final_grade_points`` and component marks on the matching ``sis_enrollments`` row.
  2. Recalculates the semester SGPA from all graded enrollments in that
     semester.
  3. Recalculates the cumulative CGPA across every semester.
  4. Upserts the corresponding ``sis_transcripts`` row.

Run this file as a standalone process alongside the FastAPI application:

    python -m app.kafka_consumer
"""

import json
import logging
import time
import httpx
import asyncio

from kafka import KafkaConsumer
from sqlalchemy import func as sa_func

from app.config import settings
from app.database import SessionLocal
from app.models import SisEnrollment, SisTranscript, LmsCourse, SisStudent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sis.kafka_consumer")


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #

async def _send_notification_internal(user_id: str, title: str, message: str):
    """Push notification to the Notification Service via internal API."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.GATEWAY_URL}/api/v1/notify/internal/notifications",
                json={
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "type": "academic",
                    "priority": "high"
                },
                headers={"X-Internal-API-Key": "change-me-internal-key"},
                timeout=5.0
            )
    except Exception as exc:
        logger.error("Failed to send notification to %s: %s", user_id, exc)


def _get_consumer() -> KafkaConsumer:
    """Create a KafkaConsumer with retry logic for broker availability."""
    while True:
        try:
            consumer = KafkaConsumer(
                "grade_submitted",
                bootstrap_servers=settings.KAFKA_BROKER,
                group_id="sis-service-grade-consumer",
                auto_offset_reset="earliest",
                enable_auto_commit=True,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )
            logger.info("Connected to Kafka broker at %s", settings.KAFKA_BROKER)
            return consumer
        except Exception as exc:
            logger.warning(
                "Kafka broker not available (%s). Retrying in 5 seconds...", exc
            )
            time.sleep(5)


def _recalculate_transcript(db, student_id: int, semester_id: int) -> None:
    """
    Recalculate weighted SGPA for the given semester and CGPA across all 
    semesters, then upsert the transcript row.
    """

    # -- Semester SGPA (Weighted) ------------------------------------------- #
    semester_enrollments = (
        db.query(SisEnrollment.final_grade_points, LmsCourse.credit_hours)
        .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
        .filter(
            SisEnrollment.student_id == student_id,
            LmsCourse.semester_id == semester_id,
            SisEnrollment.final_grade_points.isnot(None),
            SisEnrollment.status.in_(["Completed", "Graded"]),
        )
        .all()
    )

    if not semester_enrollments:
        return

    sem_quality_points = sum((e.final_grade_points or 0.0) * (e.credit_hours or 0) for e in semester_enrollments)
    sem_credits = sum(e.credit_hours or 0 for e in semester_enrollments)
    
    sgpa = round(sem_quality_points / sem_credits, 2) if sem_credits > 0 else 0.0

    # -- Cumulative CGPA (Weighted) ------------------------------------------ #
    # We fetch ALL completed enrollments across ALL semesters to get an accurate weighted CGPA
    all_enrollments = (
        db.query(SisEnrollment.final_grade_points, LmsCourse.credit_hours)
        .join(LmsCourse, SisEnrollment.course_id == LmsCourse.course_id)
        .filter(
            SisEnrollment.student_id == student_id,
            SisEnrollment.final_grade_points.isnot(None),
            SisEnrollment.status.in_(["Completed", "Graded"]),
        )
        .all()
    )

    total_quality_points = sum((e.final_grade_points or 0.0) * (e.credit_hours or 0) for e in all_enrollments)
    total_credits = sum(e.credit_hours or 0 for e in all_enrollments)
    
    cgpa = round(total_quality_points / total_credits, 2) if total_credits > 0 else 0.0

    # -- Upsert transcript row ---------------------------------------------- #
    transcript = (
        db.query(SisTranscript)
        .filter(
            SisTranscript.student_id == student_id,
            SisTranscript.semester_id == semester_id,
        )
        .first()
    )

    if transcript:
        transcript.sgpa = sgpa
        transcript.cgpa = cgpa
        transcript.generated_at = sa_func.now()
    else:
        transcript = SisTranscript(
            student_id=student_id,
            semester_id=semester_id,
            sgpa=sgpa,
            cgpa=cgpa,
        )
        db.add(transcript)

    db.commit()
    logger.info(
        "Transcript updated: student_id=%s semester_id=%s sgpa=%.2f cgpa=%.2f",
        student_id,
        semester_id,
        sgpa,
        cgpa,
    )


# --------------------------------------------------------------------------- #
#  Main consumer loop
# --------------------------------------------------------------------------- #

def consume():
    """Block and consume ``grade_submitted`` messages indefinitely."""
    consumer = _get_consumer()
    logger.info("Listening on topic 'grade_submitted'...")

    for message in consumer:
        data = message.value
        logger.info("Received grade_submitted event: %s", data)

        student_id = data.get("student_id")
        course_id = data.get("section_id") # Note: LMS sends course_id as section_id
        grade_points = data.get("grade_points")

        if student_id is None or course_id is None:
            logger.warning("Malformed message, skipping: %s", data)
            continue

        db = SessionLocal()
        try:
            # 1. Update the enrollment record
            enrollment = (
                db.query(SisEnrollment)
                .filter(
                    SisEnrollment.student_id == student_id,
                    SisEnrollment.course_id == course_id,
                    SisEnrollment.status != "Withdrawn",
                )
                .first()
            )

            if not enrollment:
                logger.warning(
                    "No active enrollment found for student_id=%s course_id=%s",
                    student_id,
                    course_id,
                )
                continue

            # Update granular marks if provided in payload
            updated_fields = []

            if "midterm_marks" in data and data["midterm_marks"] is not None:
                enrollment.midterm_marks = data["midterm_marks"]
                updated_fields.append(f"Midterm Marks ({data['midterm_marks']})")
            if "finalterm_marks" in data and data["finalterm_marks"] is not None:
                enrollment.finalterm_marks = data["finalterm_marks"]
                updated_fields.append(f"Final Term Marks ({data['finalterm_marks']})")
            if "sessional_marks" in data and data["sessional_marks"] is not None:
                enrollment.sessional_marks = data["sessional_marks"]
                updated_fields.append(f"Sessional Marks ({data['sessional_marks']})")
            
            if grade_points is not None:
                enrollment.final_grade_points = grade_points
                updated_fields.append(f"Final Grade GP ({grade_points})")
            
            db.flush()

            # 2. Determine the semester from the course mirror
            course = (
                db.query(LmsCourse)
                .filter(LmsCourse.course_id == course_id)
                .first()
            )

            # Send Notification if we have updated something
            if updated_fields:
                student = db.query(SisStudent).filter(SisStudent.student_id == student_id).first()
                if student and student.user_id:
                    course_title = course.title if course else f"Course {course_id}"
                    try:
                        # Use current loop or create one for the notification call
                        try:
                            loop = asyncio.get_event_loop()
                        except RuntimeError:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                        
                        fields_str = ", ".join(updated_fields)
                        loop.run_until_complete(_send_notification_internal(
                            user_id=str(student.user_id),
                            title="Academic Grades Updated",
                            message=f"Your grades/marks for {course_title} have been updated: {fields_str}."
                        ))
                    except Exception as n_exc:
                        logger.error("Notification error: %s", n_exc)

            if not course or not course.semester_id:
                logger.warning(
                    "Course %s has no semester_id; skipping transcript update",
                    course_id,
                )
                db.commit()
                continue

            # 3. Recalculate transcript
            _recalculate_transcript(db, student_id, course.semester_id)

        except Exception:
            db.rollback()
            logger.exception(
                "Error processing grade_submitted for student_id=%s course_id=%s",
                student_id,
                course_id,
            )
        finally:
            db.close()


# --------------------------------------------------------------------------- #
#  Entry-point
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    consume()
