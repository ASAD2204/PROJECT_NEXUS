from datetime import date, datetime
from typing import List, Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.kafka_producer import publish_payment_processed
from app.models import (
    FinFeeHead,
    FinFine,
    FinInvoice,
    FinInvoiceItem,
    FinTransaction,
    SisStudent,
)
from app.schemas import (
    FeeHeadCreate,
    FeeHeadOut,
    FeeHeadUpdate,
    FineOut,
    InvoiceGenerateRequest,
    InvoiceOut,
    MessageResponse,
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    TransactionOut,
)

router = APIRouter(prefix="/finance", tags=["Finance"])

stripe.api_key = settings.STRIPE_SECRET_KEY


# ── Invoices ──────────────────────────────────────────────────────────────

@router.get("/invoices/me", response_model=List[InvoiceOut])
def my_invoices(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == current_user["user_id"])
        .first()
    )
    if not student:
        return []
    invoices = (
        db.query(FinInvoice)
        .filter(FinInvoice.student_id == student.student_id)
        .order_by(FinInvoice.invoice_id.desc())
        .all()
    )
    return invoices


@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility endpoint for invoice listing."""
    query = db.query(FinInvoice)
    role = str(current_user.get("role", "")).lower()

    if role == "admin":
        if student_id is not None:
            query = query.filter(FinInvoice.student_id == student_id)
    else:
        student = (
            db.query(SisStudent)
            .filter(SisStudent.user_id == current_user["user_id"])
            .first()
        )
        if not student:
            return []
        query = query.filter(FinInvoice.student_id == student.student_id)

    if status_filter:
        query = query.filter(FinInvoice.status == status_filter)

    return query.order_by(FinInvoice.invoice_id.desc()).all()


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch one invoice by invoice_id with ownership checks for non-admin users."""
    invoice = db.query(FinInvoice).filter(FinInvoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if str(current_user.get("role", "")).lower() != "admin":
        student = (
            db.query(SisStudent)
            .filter(SisStudent.user_id == current_user["user_id"])
            .first()
        )
        if not student or invoice.student_id != student.student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return invoice


@router.get("/invoices/student/{student_id}", response_model=List[InvoiceOut])
def student_invoices(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return (
        db.query(FinInvoice)
        .filter(FinInvoice.student_id == student_id)
        .order_by(FinInvoice.invoice_id.desc())
        .all()
    )


@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Frontend compatibility endpoint for creating a single invoice."""
    student_id = payload.get("student_id")
    semester_id = payload.get("semester_id")
    total_amount = payload.get("total_amount")
    due_date_raw = payload.get("due_date")

    if student_id is None or total_amount is None:
        raise HTTPException(status_code=400, detail="student_id and total_amount are required")

    try:
        due_date_value = date.fromisoformat(due_date_raw) if due_date_raw else None
    except ValueError:
        raise HTTPException(status_code=400, detail="due_date must be an ISO date string")

    invoice = FinInvoice(
        student_id=int(student_id),
        semester_id=int(semester_id) if semester_id is not None else None,
        total_amount=float(total_amount),
        due_date=due_date_value,
        status=str(payload.get("status", "Unpaid")),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/invoices/generate", response_model=MessageResponse)
def generate_invoices(
    payload: InvoiceGenerateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    fee_heads = db.query(FinFeeHead).all()
    if not fee_heads:
        raise HTTPException(status_code=400, detail="No fee heads configured")

    total = sum(float(fh.default_amount) for fh in fee_heads)
    created = 0

    for sid in payload.student_ids:
        # Check if invoice already exists
        existing = (
            db.query(FinInvoice)
            .filter(
                FinInvoice.student_id == sid,
                FinInvoice.semester_id == payload.semester_id,
            )
            .first()
        )
        if existing:
            continue

        invoice = FinInvoice(
            student_id=sid,
            semester_id=payload.semester_id,
            total_amount=total,
            due_date=payload.due_date,
            status="Unpaid",
        )
        db.add(invoice)
        db.flush()

        for fh in fee_heads:
            item = FinInvoiceItem(
                invoice_id=invoice.invoice_id,
                head_id=fh.head_id,
                amount=fh.default_amount,
            )
            db.add(item)
        created += 1

    db.commit()
    return MessageResponse(message=f"Generated {created} invoices")


# ── Payments ──────────────────────────────────────────────────────────────

@router.post("/payments/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(
    payload: PaymentInitiateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    invoice = (
        db.query(FinInvoice)
        .filter(FinInvoice.invoice_id == payload.invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status == "Paid":
        raise HTTPException(status_code=400, detail="Invoice already paid")

    try:
        intent = stripe.PaymentIntent.create(
            amount=int(float(invoice.total_amount) * 100),  # Convert to cents
            currency="pkr",
            metadata={"invoice_id": str(invoice.invoice_id)},
        )
        return PaymentInitiateResponse(
            client_secret=intent.client_secret,
            invoice_id=invoice.invoice_id,
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/{invoice_id}", response_model=PaymentInitiateResponse)
def initiate_payment_compat(
    invoice_id: int,
    _payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility alias for payment initiation."""
    return initiate_payment(
        payload=PaymentInitiateRequest(invoice_id=invoice_id),
        db=db,
        current_user=current_user,
    )


@router.post("/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload_bytes = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload_bytes, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        invoice_id = int(intent["metadata"].get("invoice_id", 0))

        invoice = (
            db.query(FinInvoice)
            .filter(FinInvoice.invoice_id == invoice_id)
            .first()
        )
        if invoice:
            invoice.status = "Paid"
            trx = FinTransaction(
                invoice_id=invoice_id,
                gateway_ref=intent["id"],
                amount_paid=intent["amount"] / 100,
                method="Stripe",
            )
            db.add(trx)
            db.commit()

            try:
                publish_payment_processed(
                    invoice_id=invoice_id,
                    student_id=invoice.student_id,
                    amount=float(invoice.total_amount),
                )
            except Exception:
                pass

    return {"status": "ok"}


@router.get("/payments/history", response_model=List[TransactionOut])
def payment_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == current_user["user_id"])
        .first()
    )
    if not student:
        return []
    invoice_ids = [
        inv.invoice_id
        for inv in db.query(FinInvoice)
        .filter(FinInvoice.student_id == student.student_id)
        .all()
    ]
    if not invoice_ids:
        return []
    return (
        db.query(FinTransaction)
        .filter(FinTransaction.invoice_id.in_(invoice_ids))
        .order_by(FinTransaction.trx_date.desc())
        .all()
    )


@router.get("/payments")
def list_payments_compat(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility endpoint returning payment rows."""
    rows = payment_history(db=db, current_user=current_user)
    return {
        "payments": [
            {
                "id": row.trx_id,
                "invoice_id": row.invoice_id,
                "amount": float(row.amount_paid),
                "method": row.method,
                "date": row.trx_date.isoformat() if row.trx_date else None,
            }
            for row in rows
        ]
    }


@router.get("/ledger")
def ledger_compat(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend-compatible financial ledger view for admin dashboard."""
    # Students can only see their own rows, admins see all invoices.
    is_admin = str(current_user.get("role", "")).lower() == "admin"

    invoice_query = db.query(FinInvoice)
    if not is_admin:
        student = (
            db.query(SisStudent)
            .filter(SisStudent.user_id == current_user["user_id"])
            .first()
        )
        if not student:
            return {"transactions": []}
        invoice_query = invoice_query.filter(FinInvoice.student_id == student.student_id)

    invoices = invoice_query.order_by(FinInvoice.invoice_id.desc()).all()
    transactions = []
    for invoice in invoices:
        paid_txn = (
            db.query(FinTransaction)
            .filter(FinTransaction.invoice_id == invoice.invoice_id)
            .order_by(FinTransaction.trx_date.desc())
            .first()
        )

        transactions.append(
            {
                "id": f"INV-{invoice.invoice_id}",
                "student": f"Student {invoice.student_id}",
                "rollNo": str(invoice.student_id),
                "amount": float(invoice.total_amount),
                "status": invoice.status,
                "date": invoice.due_date.isoformat() if invoice.due_date else None,
                "method": paid_txn.method if paid_txn else None,
            }
        )

    return {"transactions": transactions}


# ── Fee Heads ─────────────────────────────────────────────────────────────

@router.get("/fee-heads", response_model=List[FeeHeadOut])
def list_fee_heads(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(FinFeeHead).all()


@router.post("/fee-heads", response_model=FeeHeadOut, status_code=status.HTTP_201_CREATED)
def create_fee_head(
    payload: FeeHeadCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    fee_head = FinFeeHead(title=payload.title, default_amount=payload.default_amount)
    db.add(fee_head)
    db.commit()
    db.refresh(fee_head)
    return fee_head


@router.put("/fee-heads/{head_id}", response_model=FeeHeadOut)
def update_fee_head(
    head_id: int,
    payload: FeeHeadUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    fee_head = db.query(FinFeeHead).filter(FinFeeHead.head_id == head_id).first()
    if not fee_head:
        raise HTTPException(status_code=404, detail="Fee head not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(fee_head, field, value)
    db.commit()
    db.refresh(fee_head)
    return fee_head


# ── Fines ─────────────────────────────────────────────────────────────────

@router.get("/fines/me", response_model=List[FineOut])
def my_fines(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == current_user["user_id"])
        .first()
    )
    if not student:
        return []
    invoice_ids = [
        inv.invoice_id
        for inv in db.query(FinInvoice)
        .filter(FinInvoice.student_id == student.student_id)
        .all()
    ]
    if not invoice_ids:
        return []
    return (
        db.query(FinFine)
        .filter(FinFine.invoice_id.in_(invoice_ids))
        .order_by(FinFine.applied_at.desc())
        .all()
    )


@router.get("/fines", response_model=List[FineOut])
def list_fines(
    invoice_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility endpoint for fine listing."""
    role = str(current_user.get("role", "")).lower()

    if role == "admin":
        query = db.query(FinFine)
        if invoice_id is not None:
            query = query.filter(FinFine.invoice_id == invoice_id)
        return query.order_by(FinFine.applied_at.desc()).all()

    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == current_user["user_id"])
        .first()
    )
    if not student:
        return []

    student_invoice_ids = [
        inv.invoice_id
        for inv in db.query(FinInvoice)
        .filter(FinInvoice.student_id == student.student_id)
        .all()
    ]
    if not student_invoice_ids:
        return []

    query = db.query(FinFine).filter(FinFine.invoice_id.in_(student_invoice_ids))
    if invoice_id is not None:
        query = query.filter(FinFine.invoice_id == invoice_id)
    return query.order_by(FinFine.applied_at.desc()).all()


@router.post("/fines/apply", response_model=MessageResponse)
def apply_late_fines(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    today = date.today()
    overdue_invoices = (
        db.query(FinInvoice)
        .filter(
            FinInvoice.status == "Unpaid",
            FinInvoice.due_date < today,
        )
        .all()
    )

    applied = 0
    for invoice in overdue_invoices:
        days_overdue = (today - invoice.due_date).days
        fine_amount = float(invoice.total_amount) * 0.05

        fine = FinFine(
            invoice_id=invoice.invoice_id,
            days_overdue=days_overdue,
            fine_amount=fine_amount,
        )
        db.add(fine)
        invoice.status = "Overdue"
        applied += 1

    db.commit()
    return MessageResponse(message=f"Applied fines to {applied} overdue invoices")


# ── Fee Heads Delete ───────────────────────────────────────────────────────

@router.delete("/fee-heads/{head_id}", response_model=MessageResponse)
def delete_fee_head(
    head_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Admin deletes a fee head."""
    fee_head = db.query(FinFeeHead).filter(FinFeeHead.head_id == head_id).first()
    if not fee_head:
        raise HTTPException(status_code=404, detail="Fee head not found")

    db.delete(fee_head)
    db.commit()
    return MessageResponse(message=f"Fee head {head_id} deleted successfully")


# ── Payment Reminders ──────────────────────────────────────────────────────

@router.post("/reminders", response_model=MessageResponse)
def send_payment_reminder(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Admin sends payment reminder to a student with outstanding dues."""
    student = (
        db.query(SisStudent)
        .filter(SisStudent.student_id == student_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get unpaid invoices
    unpaid_invoices = (
        db.query(FinInvoice)
        .filter(
            FinInvoice.student_id == student_id,
            FinInvoice.status.in_(["Unpaid", "Overdue"]),
        )
        .all()
    )

    if not unpaid_invoices:
        return MessageResponse(message="Student has no outstanding dues")

    total_due = sum(inv.total_amount for inv in unpaid_invoices)

    # TODO: Integrate with notification-service to send SMS/Email
    # publish_event('payment_reminder_sent', {
    #     'student_id': student_id,
    #     'total_due': total_due,
    #     'invoice_count': len(unpaid_invoices)
    # })

    return MessageResponse(
        message=f"Payment reminder sent to student. Outstanding due: {total_due}"
    )
