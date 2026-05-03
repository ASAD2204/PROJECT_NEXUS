import json
import logging

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


def publish_grade_submitted(student_id: int, section_id: int, grade_points: float):
    _publish('grade_submitted', {
        "student_id": student_id,
        "section_id": section_id,
        "grade_points": grade_points,
        "event": "GRADE_SUBMITTED"
    })


def publish_assignment_due(assignment_id: int, section_id: int):
    _publish('assignment_due', {
        "assignment_id": assignment_id,
        "section_id": section_id,
        "event": "ASSIGNMENT_DUE"
    })
