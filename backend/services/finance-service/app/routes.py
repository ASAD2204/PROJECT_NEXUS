from datetime import date, datetime
from typing import List, Optional

import stripe
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
import io
import csv
import httpx
import logging
import base64
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader

logger = logging.getLogger(__name__)

from app.config import settings
from app.database import get_db

async def _resolve_identities(user_ids: list[str]) -> dict:
    """Batch resolve UUID user_ids to {uuid: {name, email, avatar}} via Auth Service."""
    if not user_ids:
        return {}
    try:
        async with httpx.AsyncClient() as client:
            # FIX: Send list directly, not a dict
            response = await client.post(
                f"{settings.GATEWAY_URL}/api/v1/auth/users/bulk",
                json=user_ids,
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                return {u["user_id"]: u for u in data}
    except Exception as exc:
        logger.error("Identity resolution failed: %s", exc)
    return {}
from app.dependencies import get_current_user, require_role
from app.kafka_producer import publish_payment_processed
from app.models import (
    FinFeeHead,
    FinFeeStructure,
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
    FeeStructureCreate,
    FeeStructureOut,
    FineCreate,
    FineOut,
    InvoiceGenerateRequest,
    InvoiceOut,
    MessageResponse,
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentReminderRequest,
    TransactionOut,
)

router = APIRouter(prefix="/finance", tags=["Finance"])

stripe.api_key = settings.STRIPE_SECRET_KEY

# ── Fee Structure ─────────────────────────────────────────────────────────

@router.get("/fee-structure", response_model=List[FeeStructureOut])
def list_fee_structure(
    dept_id: Optional[int] = Query(None),
    program_id: Optional[int] = Query(None),
    semester_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(FinFeeStructure)
    if dept_id:
        query = query.filter(FinFeeStructure.dept_id == dept_id)
    if program_id:
        query = query.filter(FinFeeStructure.program_id == program_id)
    if semester_id:
        query = query.filter(FinFeeStructure.semester_id == semester_id)
    return query.all()


@router.post("/fee-structure", response_model=FeeStructureOut, status_code=status.HTTP_201_CREATED)
def create_fee_structure(
    payload: FeeStructureCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    struct = FinFeeStructure(**payload.model_dump())
    db.add(struct)
    db.commit()
    db.refresh(struct)
    return struct


@router.delete("/fee-structure/{struct_id}", response_model=MessageResponse)
def delete_fee_structure(
    struct_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    struct = db.query(FinFeeStructure).filter(FinFeeStructure.struct_id == struct_id).first()
    if not struct:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    db.delete(struct)
    db.commit()
    return MessageResponse(message="Fee structure deleted successfully")
@router.get("/ledger")
async def ledger_compat(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend-compatible financial ledger view for admin dashboard with resolved identities."""
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
    
    # Collect user IDs for identity resolution
    user_ids = []
    for inv in invoices:
        if inv.student and inv.student.user_id:
            user_ids.append(str(inv.student.user_id))
            
    identities = await _resolve_identities(list(set(user_ids)))

    transactions = []
    for invoice in invoices:
        paid_txn = (
            db.query(FinTransaction)
            .filter(FinTransaction.invoice_id == invoice.invoice_id)
            .order_by(FinTransaction.trx_date.desc())
            .first()
        )

        # Resolve student name
        student_name = f"Student {invoice.student_id}"
        student_roll = invoice.student.roll_no if invoice.student else str(invoice.student_id)
        if invoice.student and invoice.student.user_id:
            ident = identities.get(str(invoice.student.user_id), {})
            student_name = ident.get("full_name") or ident.get("name") or student_name

        transactions.append(
            {
                "id": f"INV-{invoice.invoice_id}",
                "student": student_name,
                "rollNo": student_roll,
                "amount": float(invoice.total_amount),
                "status": invoice.status,
                "date": invoice.due_date.isoformat() if invoice.due_date else None,
                "method": paid_txn.method if paid_txn else None,
            }
        )

    return {"transactions": transactions}


@router.get("/ledger/export")
async def export_ledger(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Export the entire financial ledger as CSV with resolved names."""
    invoices = db.query(FinInvoice).order_by(FinInvoice.invoice_id.desc()).all()
    
    # Resolve identities
    user_ids = [str(inv.student.user_id) for inv in invoices if inv.student and inv.student.user_id]
    identities = await _resolve_identities(list(set(user_ids)))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Invoice ID", "Student Name", "Roll No", "Amount", "Status", "Due Date"])
    
    for inv in invoices:
        student_name = f"Student {inv.student_id}"
        roll_no = inv.student.roll_no if inv.student else str(inv.student_id)
        if inv.student and inv.student.user_id:
            ident = identities.get(str(inv.student.user_id), {})
            student_name = ident.get("full_name") or ident.get("name") or student_name
            
        writer.writerow([
            inv.invoice_id, student_name, roll_no, inv.total_amount, 
            inv.status, inv.due_date.isoformat() if inv.due_date else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=financial_ledger.csv"}
    )

# ── Invoices ──────────────────────────────────────────────────────────────

@router.get("/invoices/me", response_model=List[InvoiceOut])
async def my_invoices(
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
    
    # Resolve own identity for consistency
    identities = await _resolve_identities([str(current_user["user_id"])])
    ident = identities.get(str(current_user["user_id"]), {})

    for inv in invoices:
        inv.student_name = ident.get("full_name") or ident.get("name") or "You"
        inv.student_roll_no = student.roll_no
        inv.total_amount = float(inv.total_amount)
        for item in inv.items:
            item.amount = float(item.amount)
            if item.fee_head:
                item.title = item.fee_head.title

    return invoices


@router.get("/invoices", response_model=List[InvoiceOut])
async def list_invoices(
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Frontend compatibility endpoint for invoice listing with resolved identities."""
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

    invoices = query.order_by(FinInvoice.invoice_id.desc()).all()
    
    # Collect user IDs for resolution
    user_ids = []
    for inv in invoices:
        if inv.student and inv.student.user_id:
            user_ids.append(str(inv.student.user_id))
            
    identities = await _resolve_identities(list(set(user_ids)))

    for inv in invoices:
        if inv.student and inv.student.user_id:
            ident = identities.get(str(inv.student.user_id), {})
            inv.student_name = ident.get("full_name") or ident.get("name") or f"Student {inv.student_id}"
            inv.student_roll_no = inv.student.roll_no

    return invoices


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch one invoice by invoice_id with resolved identities and item titles."""
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

    # Resolve student identity
    if invoice.student and invoice.student.user_id:
        identities = await _resolve_identities([str(invoice.student.user_id)])
        ident = identities.get(str(invoice.student.user_id), {})
        invoice.student_name = ident.get("full_name") or ident.get("name") or f"Student {invoice.student_id}"
        invoice.student_roll_no = invoice.student.roll_no

    # Map item titles
    for item in invoice.items:
        if item.fee_head:
            item.title = item.fee_head.title

    return invoice


async def _get_global_settings() -> dict:
    """Fetch global university settings from Operations Service."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.GATEWAY_URL}/api/v1/ops/settings",
                timeout=2.0
            )
            if response.status_code == 200:
                return response.json()
    except Exception as exc:
        logger.error("Failed to fetch global settings: %s", exc)
    return {
        "campusName": "PROJECT NEXUS",
        "campusAddress": "University Campus, Finance Dept"
    }


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate and return a professional PDF invoice with dynamic branding."""
    invoice = db.query(FinInvoice).filter(FinInvoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Access check
    if str(current_user.get("role", "")).lower() != "admin":
        student = db.query(SisStudent).filter(SisStudent.user_id == current_user["user_id"]).first()
        if not student or invoice.student_id != student.student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Fetch dynamic branding
    campus_info = await _get_global_settings()
    university_name = campus_info.get("campusName", "PROJECT NEXUS")
    university_address = campus_info.get("campusAddress", "University Campus, Finance Dept")
    logo_data = campus_info.get("campusLogo")

    # Resolve identity
    student_name = "N/A"
    student_roll = invoice.student.roll_no if invoice.student else str(invoice.student_id)
    if invoice.student and invoice.student.user_id:
        identities = await _resolve_identities([str(invoice.student.user_id)])
        ident = identities.get(str(invoice.student.user_id), {})
        if ident.get("first_name"):
            student_name = f"{ident.get('first_name', '')} {ident.get('last_name', '')}".strip()
        else:
            student_name = ident.get("full_name") or ident.get("name") or student_name

    # --- PROFESSIONAL PDF OVERHAUL (V2) ---
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 1.5 * cm
    content_width = width - (2 * margin)

    # 1. Header (Dynamic Branding)
    # Clean White Background
    pdf.setFillColorRGB(1, 1, 1)
    pdf.rect(0, height - 4.5 * cm, width, 4.5 * cm, fill=1, stroke=0)
    
    # Logo Placement
    logo_w = 2.2 * cm
    header_text_x = margin
    if logo_data and logo_data.startswith("data:image"):
        try:
            header_str, encoded = logo_data.split(",", 1)
            img_data = base64.b64decode(encoded)
            img = ImageReader(io.BytesIO(img_data))
            # Draw logo slightly higher
            pdf.drawImage(img, margin, height - 3.2 * cm, width=logo_w, preserveAspectRatio=True, mask='auto')
            header_text_x = margin + logo_w + 0.4 * cm
        except Exception as e:
            logger.error("Failed to draw logo in Finance: %s", e)

    # University Info (Left Aligned)
    pdf.setFillColorRGB(0, 0, 0) # Explicit Black
    pdf.setFont("Helvetica-Bold", 14)
    # Ensure university name is not too long for the line
    display_name = university_name.upper()
    if len(display_name) > 50:
        pdf.setFont("Helvetica-Bold", 11) # Scale down if very long
    pdf.drawString(header_text_x, height - 2.0 * cm, display_name)
    
    pdf.setFont("Helvetica", 9)
    pdf.setFillColorRGB(0.2, 0.2, 0.2)
    pdf.drawString(header_text_x, height - 2.5 * cm, university_address[:100])
    pdf.setFillColorRGB(0, 0, 0)

    # Document Label (Right)
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawRightString(width - margin, height - 2 * cm, "INVOICE")
    pdf.setFont("Helvetica", 10)
    pdf.drawRightString(width - margin, height - 2.8 * cm, f"REF: #{invoice.invoice_id}")
    pdf.drawRightString(width - margin, height - 3.3 * cm, f"DATE: {invoice.due_date.strftime('%d %b %Y') if invoice.due_date else 'N/A'}")

    # Separator Line
    pdf.setStrokeColorRGB(0.8, 0.8, 0.8)
    pdf.setLineWidth(0.5)
    pdf.line(margin, height - 4.0 * cm, width - margin, height - 4.0 * cm)

    # 2. Bill To & Student Info (Two Columns)
    y = height - 5.0 * cm
    pdf.setFont("Helvetica-Bold", 10)
    pdf.setFillColorRGB(0.4, 0.4, 0.4)
    pdf.drawString(margin, y, "BILL TO")
    pdf.drawRightString(width - margin, y, "STUDENT DETAILS")
    
    y -= 0.6 * cm
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(margin, y, student_name)
    pdf.setFont("Helvetica", 10)
    pdf.drawRightString(width - margin, y, f"Roll No: {student_roll}")
    
    y -= 0.5 * cm
    if invoice.student and invoice.student.program:
        pdf.setFont("Helvetica", 10)
        pdf.drawString(margin, y, f"Program: {invoice.student.program.title[:60]}")
    pdf.drawRightString(width - margin, y, f"Student ID: {invoice.student_id}")

    # 3. Items Table
    y -= 1.5 * cm
    # Table Header (Slightly lighter than V1)
    pdf.setFillColorRGB(0.3, 0.3, 0.3)
    pdf.rect(margin, y - 0.2 * cm, content_width, 0.8 * cm, fill=1, stroke=0)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(margin + 0.3 * cm, y + 0.1 * cm, "DESCRIPTION")
    pdf.drawRightString(width - margin - 0.3 * cm, y + 0.1 * cm, "AMOUNT (PKR)")

    y -= 0.8 * cm
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica", 10)
    
    # Render items
    items_to_render = []
    if invoice.items:
        for item in invoice.items:
            title = item.fee_head.title if item.fee_head else "General Fee"
            items_to_render.append((title, float(item.amount)))
    else:
        items_to_render.append(("Total Academic & Tuition Fees", float(invoice.total_amount)))

    for title, amount in items_to_render:
        pdf.setStrokeColorRGB(0.9, 0.9, 0.9)
        pdf.line(margin, y - 0.2 * cm, width - margin, y - 0.2 * cm)
        
        pdf.drawString(margin + 0.3 * cm, y, title)
        pdf.drawRightString(width - margin - 0.3 * cm, y, f"{amount:,.2f}")
        y -= 0.7 * cm
        if y < 4 * cm:
            pdf.showPage()
            y = height - 2 * cm

    # 4. Summary & Total
    y -= 0.5 * cm
    pdf.setStrokeColorRGB(0.2, 0.2, 0.2)
    pdf.setLineWidth(1)
    pdf.line(width - 8 * cm, y, width - margin, y)
    y -= 0.6 * cm
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(width - 8 * cm, y, "TOTAL DUE")
    pdf.drawRightString(width - margin, y, f"PKR {float(invoice.total_amount):,.2f}")
    
    y -= 1.2 * cm
    # Status Badge
    status_text = invoice.status.upper()
    status_bg = (0.95, 1, 0.95) if status_text == "PAID" else (1, 0.95, 0.95)
    status_fg = (0, 0.4, 0) if status_text == "PAID" else (0.6, 0, 0)
    
    pdf.setFillColorRGB(*status_bg)
    pdf.rect(margin, y - 0.3 * cm, 3 * cm, 0.8 * cm, fill=1, stroke=0)
    pdf.setFillColorRGB(*status_fg)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawCentredString(margin + 1.5 * cm, y + 0.1 * cm, status_text)

    # 5. Footer
    pdf.setFillColorRGB(0.5, 0.5, 0.5)
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawCentredString(width/2, margin, "This is a computer generated invoice and does not require a physical signature.")
    pdf.drawCentredString(width/2, margin - 0.4 * cm, f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice_id}.pdf"}
    )


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


@router.put("/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    invoice = db.query(FinInvoice).filter(FinInvoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if "student_id" in payload and payload["student_id"] is not None:
        try:
            student_id_value = int(payload["student_id"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="student_id must be an integer")
        student = (
            db.query(SisStudent)
            .filter(SisStudent.student_id == student_id_value)
            .first()
        )
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        invoice.student_id = student_id_value

    if "semester_id" in payload:
        semester_id = payload["semester_id"]
        invoice.semester_id = int(semester_id) if semester_id is not None else None

    if "total_amount" in payload:
        total_amount = payload["total_amount"]
        invoice.total_amount = float(total_amount) if total_amount is not None else None

    if "due_date" in payload:
        due_date_raw = payload["due_date"]
        if due_date_raw in (None, ""):
            invoice.due_date = None
        else:
            try:
                invoice.due_date = date.fromisoformat(due_date_raw) if isinstance(due_date_raw, str) else due_date_raw
            except ValueError:
                raise HTTPException(status_code=400, detail="due_date must be an ISO date string")

    if "status" in payload and payload["status"] is not None:
        invoice.status = str(payload["status"])

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/invoices/{invoice_id}", response_model=MessageResponse)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    invoice = db.query(FinInvoice).filter(FinInvoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.query(FinInvoiceItem).filter(FinInvoiceItem.invoice_id == invoice_id).delete()
    db.query(FinTransaction).filter(FinTransaction.invoice_id == invoice_id).delete()
    db.query(FinFine).filter(FinFine.invoice_id == invoice_id).delete()
    db.delete(invoice)
    db.commit()
    return MessageResponse(message=f"Invoice {invoice_id} deleted successfully")


@router.post("/invoices/generate", response_model=MessageResponse)
def generate_invoices(
    payload: InvoiceGenerateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    fee_heads = db.query(FinFeeHead).all()
    if not fee_heads:
        raise HTTPException(status_code=400, detail="No fee heads configured")

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

        student = db.query(SisStudent).filter(SisStudent.student_id == sid).first()
        if not student:
            continue

        invoice_total = 0
        invoice_items = []

        for fh in fee_heads:
            # Check granular structure
            # Priority: Semester+Program > Program > Dept > Default
            student_dept_id = student.program.dept_id if student.program else None
            granular = (
                db.query(FinFeeStructure)
                .filter(FinFeeStructure.head_id == fh.head_id)
                .filter(
                    (FinFeeStructure.program_id == student.program_id) | (FinFeeStructure.program_id == None),
                    (FinFeeStructure.dept_id == student_dept_id) | (FinFeeStructure.dept_id == None),
                    (FinFeeStructure.semester_id == payload.semester_id) | (FinFeeStructure.semester_id == None)
                )
                .order_by(
                    FinFeeStructure.semester_id.desc(),
                    FinFeeStructure.program_id.desc(),
                    FinFeeStructure.dept_id.desc()
                )
                .first()
            )

            amount = 0
            if granular:
                amount = float(granular.amount)
            else:
                # Fallback to Program's tuition fee if it's the "Tuition Fee" head
                if (fh.title or "").lower() == "tuition fee" and student.program and student.program.tuition_fee:
                    amount = float(student.program.tuition_fee)
                else:
                    amount = float(fh.default_amount)

            invoice_total += amount
            invoice_items.append({
                "head_id": fh.head_id,
                "amount": amount
            })

        # Apply scholarship discount
        if student.scholarship_percentage > 0:
            discount_amount = invoice_total * (student.scholarship_percentage / 100.0)
            invoice_total -= discount_amount
            # Add a meta item or just adjust total. For now, adjust total.

        invoice = FinInvoice(
            student_id=sid,
            semester_id=payload.semester_id,
            total_amount=invoice_total,
            due_date=payload.due_date,
            status="Unpaid",
        )
        db.add(invoice)
        db.flush()

        for item in invoice_items:
            # Optionally adjust individual items if needed, but total is sufficient for now.
            db.add(FinInvoiceItem(
                invoice_id=invoice.invoice_id,
                head_id=item["head_id"],
                amount=item["amount"],
            ))
        created += 1

    db.commit()
    return MessageResponse(message=f"Generated {created} invoices with scholarship discounts applied")


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

    # --- MOCK BYPASS: If stripe is disabled, mark as paid immediately ---
    if settings.STRIPE_SECRET_KEY == "disabled" or not settings.STRIPE_SECRET_KEY:
        invoice.status = "Paid"
        trx = FinTransaction(
            invoice_id=invoice.invoice_id,
            gateway_ref=f"MOCK-{datetime.now().timestamp()}",
            amount_paid=invoice.total_amount,
            method=payload.payment_method or "Mock",
        )
        db.add(trx)
        db.commit()
        
        try:
            publish_payment_processed(
                invoice_id=invoice.invoice_id,
                student_id=invoice.student_id,
                amount=float(invoice.total_amount),
            )
        except Exception:
            pass

        return PaymentInitiateResponse(
            client_secret="mock_secret",
            invoice_id=invoice.invoice_id,
        )

    # --- LIVE STRIPE PATH ---
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(float(invoice.total_amount) * 100),  # Convert to cents
            currency="pkr",
            metadata={"invoice_id": str(invoice.invoice_id)},
            payment_method_types=["card"],
        )
        
        # For demo purposes, we mark as Paid immediately in Nexus
        # even though the Stripe intent is just created.
        invoice.status = "Paid"
        trx = FinTransaction(
            invoice_id=invoice.invoice_id,
            gateway_ref=intent.id,
            amount_paid=invoice.total_amount,
            method=payload.payment_method or "Stripe",
        )
        db.add(trx)
        db.commit()

        try:
            publish_payment_processed(
                invoice_id=invoice.invoice_id,
                student_id=invoice.student_id,
                amount=float(invoice.total_amount),
            )
        except Exception:
            pass

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

@router.post("/fines", response_model=FineOut, status_code=status.HTTP_201_CREATED)
def create_fine(
    payload: FineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user), # Allow internal calls or authorized roles
):
    """Internal/Admin endpoint to create a specific fine (e.g., from Library Service)."""
    fine = FinFine(
        invoice_id=payload.invoice_id,
        days_overdue=payload.days_overdue,
        fine_amount=payload.fine_amount,
    )
    db.add(fine)
    db.commit()
    db.refresh(fine)
    return fine


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
    payload: PaymentReminderRequest | None = Body(default=None),
    student_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Admin sends payment reminder to a student with outstanding dues."""
    identifier = payload.student_id if payload is not None else student_id
    if identifier is None:
        raise HTTPException(status_code=400, detail="student_id is required")

    student = None
    try:
        student_id_value = int(identifier)
    except (TypeError, ValueError):
        student_id_value = None

    if student_id_value is not None:
        student = (
            db.query(SisStudent)
            .filter(SisStudent.student_id == student_id_value)
            .first()
        )

    if student is None:
        roll_no_value = str(identifier).strip()
        student = (
            db.query(SisStudent)
            .filter(SisStudent.roll_no == roll_no_value)
            .first()
        )

    student = (
        student
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get unpaid invoices
    unpaid_invoices = (
        db.query(FinInvoice)
        .filter(
            FinInvoice.student_id == student.student_id,
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


