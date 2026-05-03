"""
Kafka consumer for the SIS service.

Listens to the ``grade_submitted`` topic.  When a grade event arrives the
consumer:
  1. Updates ``final_grade_points`` on the matching ``sis_enrollments`` row.
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

from kafka import KafkaConsumer
from sqlalchemy import func as sa_func

from app.config import settings
from app.database import SessionLocal
from app.models import SisEnrollment, SisTranscript, LmsSection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sis.kafka_consumer")


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #

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
    Recalculate SGPA for the given semester and CGPA across all semesters,
    then upsert the transcript row.
    """

    # -- Semester SGPA ------------------------------------------------------ #
    semester_grades = (
        db.query(SisEnrollment.final_grade_points)
        .join(LmsSection, SisEnrollment.section_id == LmsSection.section_id)
        .filter(
            SisEnrollment.student_id == student_id,
            LmsSection.semester_id == semester_id,
            SisEnrollment.final_grade_points.isnot(None),
            SisEnrollment.status != "Withdrawn",
        )
        .all()
    )

    if not semester_grades:
        return

    sgpa = round(
        sum(g.final_grade_points for g in semester_grades) / len(semester_grades), 2
    )

    # -- Cumulative CGPA ---------------------------------------------------- #
    all_transcripts = (
        db.query(SisTranscript)
        .filter(
            SisTranscript.student_id == student_id,
            SisTranscript.semester_id != semester_id,
        )
        .all()
    )
    all_sgpas = [t.sgpa for t in all_transcripts if t.sgpa is not None]
    all_sgpas.append(sgpa)
    cgpa = round(sum(all_sgpas) / len(all_sgpas), 2)

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

    # Update CGPA on all previous transcripts so every row reflects the
    # latest cumulative average.
    for t in all_transcripts:
        t.cgpa = cgpa

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
        section_id = data.get("section_id")
        grade_points = data.get("grade_points")

        if student_id is None or section_id is None or grade_points is None:
            logger.warning("Malformed message, skipping: %s", data)
            continue

        db = SessionLocal()
        try:
            # 1. Update the enrollment record
            enrollment = (
                db.query(SisEnrollment)
                .filter(
                    SisEnrollment.student_id == student_id,
                    SisEnrollment.section_id == section_id,
                    SisEnrollment.status != "Withdrawn",
                )
                .first()
            )

            if not enrollment:
                logger.warning(
                    "No active enrollment found for student_id=%s section_id=%s",
                    student_id,
                    section_id,
                )
                continue

            enrollment.final_grade_points = grade_points
            db.flush()

            # 2. Determine the semester from the section
            section = (
                db.query(LmsSection)
                .filter(LmsSection.section_id == section_id)
                .first()
            )
            if not section or not section.semester_id:
                logger.warning(
                    "Section %s has no semester_id; skipping transcript update",
                    section_id,
                )
                db.commit()
                continue

            # 3. Recalculate transcript
            _recalculate_transcript(db, student_id, section.semester_id)

        except Exception:
            db.rollback()
            logger.exception(
                "Error processing grade_submitted for student_id=%s section_id=%s",
                student_id,
                section_id,
            )
        finally:
            db.close()


# --------------------------------------------------------------------------- #
#  Entry-point
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    consume()
