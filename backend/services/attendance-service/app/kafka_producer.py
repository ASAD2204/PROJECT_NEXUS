from kafka import KafkaProducer
import json
from app.config import settings

try:
    producer = KafkaProducer(
        bootstrap_servers=settings.KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
except Exception:
    producer = None


def publish_attendance_marked(student_id: int, section_id: int, status: str):
    if producer:
        producer.send(
            "attendance_marked",
            {
                "student_id": student_id,
                "section_id": section_id,
                "status": status,
                "event": "ATTENDANCE_MARKED",
            },
        )
        producer.flush()
