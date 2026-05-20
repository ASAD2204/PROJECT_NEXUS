import json
import logging
import time
from datetime import date, datetime
from decimal import Decimal

from kafka import KafkaConsumer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import FinFine, FinInvoice, FinInvoiceItem, SisStudent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finance.kafka_consumer")

def _get_consumer():
    while True:
        try:
            consumer = KafkaConsumer(
                "library_fines",
                bootstrap_servers=settings.KAFKA_BROKER,
                group_id="finance-service-fine-group",
                auto_offset_reset="earliest",
                enable_auto_commit=True,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )
            logger.info("Connected to Kafka: library_fines")
            return consumer
        except Exception as e:
            logger.warning("Kafka not ready, retrying in 5s: %s", e)
            time.sleep(5)

def consume():
    consumer = _get_consumer()
    for message in consumer:
        data = message.value
        logger.info("Received library fine event: %s", data)
        
        student_id = data.get("student_id")
        user_id = data.get("user_id")
        fine_amount = data.get("fine_amount", 0)
        days_overdue = data.get("days_overdue", 0)
        book_title = data.get("book_title", "Library Book")

        if fine_amount <= 0:
            continue

        db = SessionLocal()
        try:
            # 1. Resolve student if not provided but user_id is
            if not student_id and user_id:
                student = db.query(SisStudent).filter(SisStudent.user_id == user_id).first()
                if student:
                    student_id = student.student_id

            if not student_id:
                logger.warning("No student_id found for fine; skipping ledger entry.")
                continue

            # 2. Find or create an Unpaid invoice for this student
            invoice = (
                db.query(FinInvoice)
                .filter(
                    FinInvoice.student_id == student_id,
                    FinInvoice.status.in_(["Unpaid", "Overdue"]),
                )
                .order_by(FinInvoice.invoice_id.desc())
                .first()
            )

            if not invoice:
                # Create a specific Library Fine invoice if no open one exists
                invoice = FinInvoice(
                    student_id=student_id,
                    total_amount=Decimal(str(fine_amount)),
                    due_date=date.today(),
                    status="Unpaid"
                )
                db.add(invoice)
                db.flush()
                logger.info("Created new invoice for library fine: student=%s", student_id)
            else:
                invoice.total_amount += Decimal(str(fine_amount))
                invoice.status = "Overdue" # Flag as overdue due to late fine

            # 3. Add to FinFine record
            fine_record = FinFine(
                invoice_id=invoice.invoice_id,
                days_overdue=days_overdue,
                fine_amount=Decimal(str(fine_amount))
            )
            db.add(fine_record)
            
            # 4. Optional: Add line item to invoice
            db.add(FinInvoiceItem(
                invoice_id=invoice.invoice_id,
                amount=Decimal(str(fine_amount))
            ))

            db.commit()
            logger.info("Recorded library fine: student=%s, amount=%s", student_id, fine_amount)
            
        except Exception as e:
            logger.exception("Error processing library fine: %s", e)
            db.rollback()
        finally:
            db.close()

if __name__ == "__main__":
    consume()
