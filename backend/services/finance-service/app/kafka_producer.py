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


def publish_payment_processed(invoice_id: int, student_id: int, amount: float):
    if producer:
        producer.send(
            "payment_processed",
            {
                "invoice_id": invoice_id,
                "student_id": student_id,
                "amount": amount,
                "event": "PAYMENT_PROCESSED",
            },
        )
        producer.flush()
