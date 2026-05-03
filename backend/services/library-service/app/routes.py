import io
import csv
import httpx
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, func as sqlfunc
from sqlalchemy.orm import Session
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import FinFine, LibBook, LibIssue, LibLibrarianProfile, LibReservation, SisStudent
from app.models import FinInvoice
from app.schemas import (
    BookCreate,
    BookOut,
    BookUpdate,
    IssueCreate,
    IssueDetailOut,
    IssueOut,
    LibraryStatsOut,
    LibrarianProfileOut,
    LibrarianProfileUpdate,
    ReservationCreate,
    ReservationOut,
    ReturnOut,
)

router = APIRouter(prefix="/library", tags=["Library"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FINE_PER_DAY = 50  # PKR 50 per day
MAX_ACTIVE_ISSUES = 3
LOAN_PERIOD_DAYS = 14


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def calculate_fine(due_date: date, return_date: date) -> float:
    """Return the fine amount in PKR. Zero if returned on or before due date."""
    if return_date <= due_date:
        return 0.0
    days_overdue = (return_date - due_date).days
    return float(days_overdue * FINE_PER_DAY)


def _serialize_issue(db: Session, issue: LibIssue) -> IssueDetailOut:
    student = db.query(SisStudent).filter(SisStudent.student_id == issue.student_id).first() if issue.student_id else None
    book_id = issue.book_id if issue.book_id is not None else (issue.book.book_id if issue.book else None)
    return IssueDetailOut(
        issue_id=issue.issue_id,
        student_id=issue.student_id,
        user_id=issue.user_id,
        student_roll_no=student.roll_no if student else None,
        book_id=book_id,
        issue_date=issue.issue_date,
        due_date=issue.due_date,
        return_date=issue.return_date,
        status=issue.status,
        fine_amount=float(issue.fine_amount or 0.0),
        days_overdue=issue.days_overdue or 0,
        created_at=getattr(issue, "created_at", None),
        updated_at=getattr(issue, "updated_at", None),
        book=issue.book,
    )


def _serialize_reservation(db: Session, reservation: LibReservation) -> ReservationOut:
    student = db.query(SisStudent).filter(SisStudent.student_id == reservation.student_id).first() if reservation.student_id else None
    book_id = reservation.book_id if reservation.book_id is not None else (reservation.book.book_id if reservation.book else None)
    return ReservationOut(
        reservation_id=reservation.reservation_id,
        student_id=reservation.student_id,
        user_id=reservation.user_id,
        student_roll_no=student.roll_no if student else None,
        book_id=book_id,
        reserved_at=reservation.reserved_at,
        expires_at=reservation.expires_at,
        status=reservation.status,
        book=reservation.book,
    )

def _get_or_create_librarian_profile(db: Session, user_id) -> LibLibrarianProfile:
    profile = (
        db.query(LibLibrarianProfile)
        .filter(LibLibrarianProfile.user_id == str(user_id))
        .first()
    )
    if profile:
        return profile

    profile = LibLibrarianProfile(user_id=str(user_id))
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# Catalog endpoints
# ---------------------------------------------------------------------------

@router.get("/books", response_model=list[BookOut])
def search_books(
    title: Optional[str] = Query(None, description="Partial title search"),
    author: Optional[str] = Query(None, description="Partial author search"),
    isbn: Optional[str] = Query(None, description="Exact or partial ISBN"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Search the book catalog by title, author, or ISBN."""
    query = db.query(LibBook)

    if title:
        query = query.filter(LibBook.title.ilike(f"%{title}%"))
    if author:
        query = query.filter(LibBook.author.ilike(f"%{author}%"))
    if isbn:
        query = query.filter(LibBook.isbn.ilike(f"%{isbn}%"))

    books = query.order_by(LibBook.title).offset(skip).limit(limit).all()
    return books


@router.get("/books/export")
def export_books(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Export the entire book catalog as a CSV file."""
    books = db.query(LibBook).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ISBN", "Title", "Author", "Category", "Publisher", "Year", "TotalCopies", "Available"])
    
    for book in books:
        writer.writerow([
            book.isbn, book.title, book.author, book.category, 
            book.publisher, book.publication_year, book.total_copies, book.available_copies
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=book_catalog.csv"}
    )


@router.post("/books/import")
async def import_books(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Import books from a CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported_count = 0
    errors = []
    
    for row in reader:
        try:
            isbn = row.get("ISBN", "").strip()
            if not isbn: continue
            
            existing = db.query(LibBook).filter(LibBook.isbn == isbn).first()
            if existing:
                existing.total_copies += int(row.get("TotalCopies", 1))
                existing.available_copies += int(row.get("TotalCopies", 1))
            else:
                book = LibBook(
                    isbn=isbn,
                    title=row.get("Title", "Unknown"),
                    author=row.get("Author", "Unknown"),
                    category=row.get("Category", "General"),
                    publisher=row.get("Publisher"),
                    publication_year=int(row.get("Year", 2000)),
                    total_copies=int(row.get("TotalCopies", 1)),
                    available_copies=int(row.get("TotalCopies", 1)),
                )
                db.add(book)
            imported_count += 1
        except Exception as e:
            errors.append(f"Error processing ISBN {row.get('ISBN')}: {str(e)}")
            
    db.commit()
    return {"message": f"Successfully imported {imported_count} books", "errors": errors}


@router.get("/books/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    """Get book details including live availability count."""
    book = db.query(LibBook).filter(LibBook.book_id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    return book


# ---------------------------------------------------------------------------
# Admin endpoints (add / update books)
# ---------------------------------------------------------------------------

@router.post(
    "/books",
    response_model=BookOut,
    status_code=status.HTTP_201_CREATED,
)
def add_book(
    payload: BookCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Add a new book to the catalog."""
    existing = db.query(LibBook).filter(LibBook.isbn == payload.isbn).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A book with ISBN {payload.isbn} already exists (book_id={existing.book_id})",
        )

    available = payload.available_copies if payload.available_copies is not None else payload.total_copies

    book = LibBook(
        isbn=payload.isbn,
        title=payload.title,
        author=payload.author,
        category=payload.category,
        publisher=payload.publisher,
        publication_year=payload.publication_year,
        pages=payload.pages,
        cover_image=payload.cover_image,
        description=payload.description,
        language=payload.language or "English",
        total_copies=payload.total_copies,
        available_copies=available,
        shelf_location=payload.shelf_location,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.put("/books/{book_id}", response_model=BookOut)
def update_book(
    book_id: int,
    payload: BookUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Update an existing book's information."""
    book = db.query(LibBook).filter(LibBook.book_id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(book, field, value)

    db.commit()
    db.refresh(book)
    return book


# ---------------------------------------------------------------------------
# Issuance endpoints (Librarian only)
# ---------------------------------------------------------------------------

@router.post(
    "/issues",
    response_model=IssueOut,
    status_code=status.HTTP_201_CREATED,
)
def issue_book(
    payload: IssueCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """
    Issue a book to a student.

    Business rules:
    - Student cannot have more than 3 active (non-returned) issues.
    - Book must have available copies > 0.
    - Due date is set to issue_date + 14 days.
    """
    # Check active issues
    query = db.query(LibIssue).filter(LibIssue.status == "Issued")
    if payload.student_id:
        active_issues = query.filter(LibIssue.student_id == payload.student_id).count()
    elif payload.user_id:
        active_issues = query.filter(LibIssue.user_id == payload.user_id).count()
    else:
        raise HTTPException(status_code=400, detail="Borrower must be specified")

    if active_issues >= MAX_ACTIVE_ISSUES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Borrower already has {active_issues} active issues (max {MAX_ACTIVE_ISSUES})",
        )

    # Check book availability
    book = db.query(LibBook).filter(LibBook.book_id == payload.book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    if book.available_copies <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No available copies for this book",
        )

    # Create the issue
    today = date.today()
    issue = LibIssue(
        student_id=payload.student_id,
        user_id=payload.user_id,
        book_id=payload.book_id,
        issue_date=today,
        due_date=today + timedelta(days=LOAN_PERIOD_DAYS),
        status="Issued",
    )
    book.available_copies -= 1

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


@router.get("/issues", response_model=list[IssueDetailOut])
async def list_issues(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Return all issue records with resolved student identities."""
    issues = db.query(LibIssue).order_by(LibIssue.issue_date.desc()).all()
    
    # Resolve Student identities via Auth Service
    user_ids = []
    for i in issues:
        if i.student and i.student.user_id:
            user_ids.append(str(i.student.user_id))
        elif i.user_id:
            user_ids.append(str(i.user_id))
    
    user_map = {}
    if user_ids:
        user_ids = list(set(user_ids))
        AUTH_SERVICE_URL = "http://auth-service:8000/api/v1/auth"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{AUTH_SERVICE_URL}/users/bulk",
                    json=user_ids,
                    timeout=5.0
                )
                if resp.status_code == 200:
                    for u in resp.json():
                        user_map[str(u["user_id"])] = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u["email"]
            except Exception as e:
                print(f"Auth Service lookup failed: {e}")

    results = []
    for i in issues:
        out = _serialize_issue(db, i)
        uid = str(i.student.user_id) if i.student and i.student.user_id else (str(i.user_id) if i.user_id else None)
        if uid:
            out.student_name = user_map.get(uid, f"User {uid[:8]}")
        results.append(out)
        
    return results


@router.post("/returns/{issue_id}", response_model=ReturnOut)
async def return_book(
    issue_id: int,
    payload: dict | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """
    Process a book return.

    If the book is overdue, a fine is calculated at PKR 50/day and posted
    to the fin_fines table. The book's available_copies is incremented.
    """
    issue = db.query(LibIssue).filter(LibIssue.issue_id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue record not found",
        )
    if issue.status == "Returned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This book has already been returned",
        )

    if payload and str(payload.get("action", "")).strip().lower() == "renew":
        issue.due_date = issue.due_date + timedelta(days=LOAN_PERIOD_DAYS)
        db.commit()
        db.refresh(issue)
        return ReturnOut(
            issue_id=issue.issue_id,
            return_date=issue.return_date or date.today(),
            days_overdue=0,
            fine_amount=0.0,
            fine_status=None,
            message=f"Book renewed successfully. New due date: {issue.due_date.isoformat()}",
        )

    today = date.today()
    issue.return_date = today
    issue.status = "Returned"

    # Increment available copies
    book = db.query(LibBook).filter(LibBook.book_id == issue.book_id).first()
    if book:
        book.available_copies += 1

    # Fine calculation
    fine_amount = calculate_fine(issue.due_date, today)
    days_overdue = max(0, (today - issue.due_date).days)
    
    issue.fine_amount = fine_amount
    issue.days_overdue = days_overdue
    fine_status = None

    if fine_amount > 0 and issue.student_id:
        # Resolve an open invoice for the student
        invoice = (
            db.query(FinInvoice)
            .filter(
                FinInvoice.student_id == issue.student_id,
                FinInvoice.status.in_(["Unpaid", "Overdue"]),
            )
            .order_by(FinInvoice.due_date.asc().nullsfirst(), FinInvoice.invoice_id.desc())
            .first()
        )
        
        # ── Refactored: Call Finance Service via HTTP ──
        FINANCE_SERVICE_URL = "http://finance-service:8000/api/v1/finance"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{FINANCE_SERVICE_URL}/fines",
                    json={
                        "invoice_id": invoice.invoice_id if invoice else None,
                        "days_overdue": days_overdue,
                        "fine_amount": fine_amount
                    },
                    timeout=5.0
                )
                if resp.status_code == 201:
                    fine_status = "unpaid"
            except Exception as e:
                print(f"Finance Service fine application failed: {e}")
                # Fallback: if service is down, we still committed the return.
                # In a real prod env, we might want to queue this or retry.

    db.commit()

    message = "Book returned successfully."
    if fine_amount > 0:
        message = (
            f"Book returned {days_overdue} day(s) late. "
            f"A fine of PKR {fine_amount:.2f} has been applied."
        )

    return ReturnOut(
        issue_id=issue.issue_id,
        return_date=today,
        days_overdue=days_overdue,
        fine_amount=fine_amount,
        fine_status=fine_status,
        message=message,
    )


# ---------------------------------------------------------------------------
# Student endpoints
# ---------------------------------------------------------------------------

@router.get("/issues/me", response_model=list[IssueDetailOut])
def my_issues(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return all issue records for the currently authenticated student."""
    from app.models import SisStudent

    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    if not student:
        return []

    issues = (
        db.query(LibIssue)
        .filter(LibIssue.student_id == student.student_id)
        .order_by(LibIssue.issue_date.desc())
        .all()
    )
    return [_serialize_issue(db, issue) for issue in issues]


# ---------------------------------------------------------------------------
# QR Code generation
# ---------------------------------------------------------------------------

@router.get("/qr/{student_id}")
def generate_qr(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a QR code PNG containing the student ID.

    The QR code can be scanned at the library desk for quick identification
    during book issuance or returns.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(student_id)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()

    img.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="qr_{student_id}.png"',
        },
    )


# ---------------------------------------------------------------------------
# Delete book (admin/librarian)
# ---------------------------------------------------------------------------

@router.delete("/books/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Delete a book from the catalog."""
    book = db.query(LibBook).filter(LibBook.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    active_issues = db.query(LibIssue).filter(
        LibIssue.book_id == book_id, LibIssue.status == "Issued"
    ).count()
    if active_issues > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete book with {active_issues} active issue(s)",
        )

    db.delete(book)
    db.commit()
    return {"detail": "Book deleted successfully"}


# ---------------------------------------------------------------------------
# Reservation endpoints
# ---------------------------------------------------------------------------

@router.post("/reservations", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
def reserve_book(
    payload: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Reserve a book. Reservation expires in 3 days."""
    from datetime import datetime, timedelta as td

    book = db.query(LibBook).filter(LibBook.book_id == payload.book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    student = (
        db.query(SisStudent)
        .filter(SisStudent.user_id == str(current_user["user_id"]))
        .first()
    )
    student_id = student.student_id if student else payload.student_id
    user_id = UUID(str(current_user["user_id"])) if not student else None

    # Check for existing active reservation
    query = db.query(LibReservation).filter(
        LibReservation.book_id == payload.book_id,
        LibReservation.status == "Active",
    )
    if student_id:
        existing = query.filter(LibReservation.student_id == student_id).first()
    else:
        existing = query.filter(LibReservation.user_id == user_id).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already reserved")

    reservation = LibReservation(
        student_id=student_id,
        user_id=user_id,
        book_id=payload.book_id,
        expires_at=datetime.utcnow() + td(days=3),
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return _serialize_reservation(db, reservation)


@router.get("/reservations", response_model=list[ReservationOut])
async def list_reservations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """List all active reservations (librarian/admin) with resolved student names."""
    reservations = db.query(LibReservation).filter(
        LibReservation.status == "Active"
    ).order_by(LibReservation.reserved_at.desc()).all()
    
    # Resolve Student identities via Auth Service
    user_ids = []
    for r in reservations:
        if r.student and r.student.user_id:
            user_ids.append(str(r.student.user_id))
        elif r.user_id:
            user_ids.append(str(r.user_id))
            
    user_map = {}
    if user_ids:
        user_ids = list(set(user_ids))
        AUTH_SERVICE_URL = "http://auth-service:8000/api/v1/auth"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{AUTH_SERVICE_URL}/users/bulk", json=user_ids, timeout=5.0)
                if resp.status_code == 200:
                    for u in resp.json():
                        user_map[str(u["user_id"])] = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u["email"]
            except Exception as e:
                print(f"Auth Service lookup failed for reservations: {e}")

    results = []
    for r in reservations:
        out = _serialize_reservation(db, r)
        uid = str(r.student.user_id) if r.student and r.student.user_id else (str(r.user_id) if r.user_id else None)
        if uid:
            out.student_name = user_map.get(uid, f"User {uid[:8]}")
        results.append(out)
    return results


@router.get("/reservations/me", response_model=list[ReservationOut])
def my_reservations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's reservations (Supports all roles)."""
    student = db.query(SisStudent).filter(
        SisStudent.user_id == str(current_user["user_id"])
    ).first()
    
    query = db.query(LibReservation).order_by(LibReservation.reserved_at.desc())
    if student:
        reservations = query.filter(LibReservation.student_id == student.student_id).all()
    else:
        reservations = query.filter(LibReservation.user_id == str(current_user["user_id"])).all()
        
    return [_serialize_reservation(db, reservation) for reservation in reservations]


@router.put("/reservations/{reservation_id}", response_model=ReservationOut)
def update_reservation_status(
    reservation_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Update reservation status (admin/librarian compatibility endpoint)."""
    reservation = db.query(LibReservation).filter(
        LibReservation.reservation_id == reservation_id
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    next_status = str(payload.get("status", "")).strip().title()
    allowed_statuses = {"Active", "Cancelled", "Fulfilled", "Expired"}
    if next_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid reservation status")

    reservation.status = next_status
    db.commit()
    db.refresh(reservation)
    return _serialize_reservation(db, reservation)


@router.delete("/reservations/{reservation_id}")
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cancel a reservation."""
    reservation = db.query(LibReservation).filter(
        LibReservation.reservation_id == reservation_id
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    reservation.status = "Cancelled"
    db.commit()
    return {"detail": "Reservation cancelled"}


# ---------------------------------------------------------------------------
# Profile endpoints
# ---------------------------------------------------------------------------

@router.get("/profile", response_model=LibrarianProfileOut)
def get_librarian_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Retrieve the logged-in librarian's profile."""
    return _get_or_create_librarian_profile(db, current_user["user_id"])


@router.put("/profile", response_model=LibrarianProfileOut)
def update_librarian_profile(
    payload: LibrarianProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Update the logged-in librarian's profile."""
    profile = _get_or_create_librarian_profile(db, current_user["user_id"])
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# Reports endpoint (librarian/admin)
# ---------------------------------------------------------------------------

@router.get("/reports", response_model=LibraryStatsOut)
def library_reports(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "librarian"])),
):
    """Get library statistics for the dashboard."""
    total_books = db.query(sqlfunc.sum(LibBook.total_copies)).scalar() or 0
    total_issued = db.query(LibIssue).filter(LibIssue.status == "Issued").count()
    total_overdue = db.query(LibIssue).filter(
        LibIssue.status == "Issued", LibIssue.due_date < date.today()
    ).count()
    total_reservations = db.query(LibReservation).filter(
        LibReservation.status == "Active"
    ).count()

    # Books by category
    cats = db.query(LibBook.category, sqlfunc.count(LibBook.book_id)).group_by(
        LibBook.category
    ).all()
    books_by_category = {c or "Uncategorized": cnt for c, cnt in cats}

    # Recent transactions (last 10 issues/returns)
    recent = db.query(LibIssue).order_by(LibIssue.issue_date.desc()).limit(10).all()
    recent_transactions = [
        {
            "issue_id": r.issue_id,
            "student_id": r.student_id,
            "book_id": r.book_id,
            "status": r.status,
            "issue_date": str(r.issue_date),
            "due_date": str(r.due_date),
        }
        for r in recent
    ]

    return LibraryStatsOut(
        total_books=total_books,
        total_issued=total_issued,
        total_overdue=total_overdue,
        total_reservations=total_reservations,
        books_by_category=books_by_category,
        recent_transactions=recent_transactions,
    )
