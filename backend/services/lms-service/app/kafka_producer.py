import json
import logging
from typing import Optional

from kafka import KafkaProducer

from app.config import settings

logger = logging.getLogger(__name__)
_producer = None


def _get_producer():
    global _producer
    if _producer is not None:
        return _producer

    try:
        _producer = KafkaProducer(
            bootstrap_servers=settings.KAFKA_BROKER,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        )
    except Exception as exc:
        logger.warning("Kafka producer unavailable: %s", exc)
        _producer = None
    return _producer


def _publish(topic: str, payload: dict):
    producer = _get_producer()
    if not producer:
        return
    try:
        producer.send(topic, payload)
        producer.flush()
    except Exception as exc:
        logger.warning("Kafka publish failed for %s: %s", topic, exc)


def send_message(topic: str, payload: dict):
    """Generic message publisher."""
    _publish(topic, payload)


def publish_grade_submitted(
    student_id: int, 
    section_id: int, 
    grade_points: Optional[float] = None,
    midterm_marks: Optional[float] = None,
    finalterm_marks: Optional[float] = None,
    sessional_marks: Optional[float] = None,
    grading_type: Optional[str] = "final",
):
    payload = {
        "student_id": student_id,
        "section_id": section_id,
        "event": "GRADE_SUBMITTED",
        "grading_type": grading_type
    }
    if grade_points is not None: payload["grade_points"] = grade_points
    if midterm_marks is not None: payload["midterm_marks"] = midterm_marks
    if finalterm_marks is not None: payload["finalterm_marks"] = finalterm_marks
    if sessional_marks is not None: payload["sessional_marks"] = sessional_marks

    _publish('grade_submitted', payload)


def publish_assignment_due(assignment_id: int, section_id: int):
    _publish('assignment_due', {
        "assignment_id": assignment_id,
        "section_id": section_id,
        "event": "ASSIGNMENT_DUE"
    })
