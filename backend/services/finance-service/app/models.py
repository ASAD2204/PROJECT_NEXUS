from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SisStudent(Base):
    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True))
    roll_no = Column(String(20))

    invoices = relationship("FinInvoice", back_populates="student")


class FinFeeHead(Base):
    __tablename__ = "fin_fee_heads"

    head_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(100))
    default_amount = Column(Numeric(10, 2))


class FinInvoice(Base):
    __tablename__ = "fin_invoices"

    invoice_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    semester_id = Column(Integer)
    total_amount = Column(Numeric(10, 2))
    due_date = Column(Date)
    status = Column(String(20), default="Unpaid")

    student = relationship("SisStudent", back_populates="invoices")
    items = relationship("FinInvoiceItem", back_populates="invoice")
    transactions = relationship("FinTransaction", back_populates="invoice")
    fines = relationship("FinFine", back_populates="invoice")


class FinInvoiceItem(Base):
    __tablename__ = "fin_invoice_items"

    item_id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("fin_invoices.invoice_id"))
    head_id = Column(Integer, ForeignKey("fin_fee_heads.head_id"))
    amount = Column(Numeric(10, 2))

    invoice = relationship("FinInvoice", back_populates="items")
    fee_head = relationship("FinFeeHead")


class FinTransaction(Base):
    __tablename__ = "fin_transactions"

    trx_id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("fin_invoices.invoice_id"))
    gateway_ref = Column(String(100))
    amount_paid = Column(Numeric(10, 2))
    trx_date = Column(TIMESTAMP, server_default=func.now())
    method = Column(String(20))

    invoice = relationship("FinInvoice", back_populates="transactions")


class FinFine(Base):
    __tablename__ = "fin_fines"

    fine_id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("fin_invoices.invoice_id"))
    days_overdue = Column(Integer)
    fine_amount = Column(Numeric(10, 2))
    applied_at = Column(TIMESTAMP, server_default=func.now())

    invoice = relationship("FinInvoice", back_populates="fines")
