from kafka import KafkaProducer
import json
import logging
from datetime import datetime
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
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
    except Exception as e:
        logger.error("Failed to initialize Kafka producer: %s", e)
        _producer = None
    return _producer

def publish_fine_generated(student_id: int, user_id: str, days_overdue: int, fine_amount: float, book_title: str):
    """
    Publish a library fine generation event to Kafka.
    Topic: library_fines
    """
    producer = _get_producer()
    if producer:
        try:
            payload = {
                "student_id": student_id,
                "user_id": user_id,
                "days_overdue": days_overdue,
                "fine_amount": fine_amount,
                "book_title": book_title,
                "event": "LIBRARY_FINE_GENERATED",
                "timestamp": datetime.now().isoformat()
            }
            producer.send("library_fines", payload)
            producer.flush()
            logger.info("Published library fine to Kafka for user %s", user_id or student_id)
        except Exception as e:
            logger.error("Failed to publish library fine to Kafka: %s", e)
    else:
        logger.warning("Kafka producer not available; fine not published to ledger.")
