from kafka import KafkaProducer
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

try:
    producer = KafkaProducer(
        bootstrap_servers=settings.KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
except Exception as e:
    logger.error("Failed to initialize Kafka producer: %s", e)
    producer = None


def publish_hr_notification(user_id: str, title: str, message: str, notif_type: str = "info"):
    """
    Publish an HR notification event to Kafka.
    Topic: hr_notifications
    """
    if producer:
        try:
            producer.send(
                "hr_notifications",
                {
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "type": notif_type,
                    "event": "HR_NOTIFICATION",
                },
            )
            producer.flush()
            logger.info("Published HR notification to Kafka for user %s", user_id)
        except Exception as e:
            logger.error("Failed to publish HR notification to Kafka: %s", e)
    else:
        logger.warning("Kafka producer not available; notification not sent.")
