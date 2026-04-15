from kafka import KafkaProducer
import json
from app.config import settings

producer = KafkaProducer(
    bootstrap_servers=settings.KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)


def publish_grade_submitted(student_id: int, section_id: int, grade_points: float):
    producer.send('grade_submitted', {
        "student_id": student_id,
        "section_id": section_id,
        "grade_points": grade_points,
        "event": "GRADE_SUBMITTED"
    })
    producer.flush()


def publish_assignment_due(assignment_id: int, section_id: int):
    producer.send('assignment_due', {
        "assignment_id": assignment_id,
        "section_id": section_id,
        "event": "ASSIGNMENT_DUE"
    })
    producer.flush()
