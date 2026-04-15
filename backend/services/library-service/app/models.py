from datetime import date, datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Referenced tables from other services (read-only mirrors / FK targets)
# ---------------------------------------------------------------------------

class SisStudent(Base):
    """Mirror of sis_students from the SIS service (FK target only)."""

    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True))
    roll_no = Column(String)

    # Back-references
    issues = relationship("LibIssue", back_populates="student")
    reservations = relationship("LibReservation", back_populates="student")


class FinFine(Base):
    """Mirror of fin_fines from the Finance service (write target for overdue fines)."""

    __tablename__ = "fin_fines"
    __table_args__ = {"extend_existing": True}

    fine_id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, nullable=True)
    days_overdue = Column(Integer, nullable=True)
    fine_amount = Column(Numeric(10, 2), nullable=False)
    applied_at = Column(DateTime, server_default=func.now())


class FinInvoice(Base):
    """Mirror of fin_invoices used to attach library fines to a student invoice."""

    __tablename__ = "fin_invoices"
    __table_args__ = {"extend_existing": True}

    invoice_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, nullable=False)
    status = Column(String(20), nullable=True)
    due_date = Column(Date, nullable=True)


# ---------------------------------------------------------------------------
# Library domain tables
# ---------------------------------------------------------------------------

class LibBook(Base):
    """Catalog of all books available in the library."""

    __tablename__ = "lib_books"

    book_id = Column(Integer, primary_key=True, autoincrement=True)
    isbn = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(300), nullable=False, index=True)
    author = Column(String(200), nullable=False, index=True)
    category = Column(String(50), nullable=True)
    publisher = Column(String(100), nullable=True)
    publication_year = Column(Integer, nullable=True)
    pages = Column(Integer, nullable=True)
    cover_image = Column(String(255), nullable=True)
    description = Column(String, nullable=True)
    language = Column(String(30), default="English")
    total_copies = Column(Integer, nullable=False, default=1)
    available_copies = Column(Integer, nullable=False, default=1)
    shelf_location = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    issues = relationship("LibIssue", back_populates="book")
    reservations = relationship("LibReservation", back_populates="book")

    def __repr__(self) -> str:
        return f"<LibBook {self.book_id} – {self.title}>"


class LibIssue(Base):
    """Tracks book issuance and returns."""

    __tablename__ = "lib_issues"

    issue_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(
        Integer,
        ForeignKey("sis_students.student_id"),
        nullable=False,
        index=True,
    )
    book_id = Column(
        Integer,
        ForeignKey("lib_books.book_id"),
        nullable=False,
        index=True,
    )
    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="Issued")  # Issued | Returned | Lost
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("SisStudent", back_populates="issues")
    book = relationship("LibBook", back_populates="issues")

    def __repr__(self) -> str:
        return f"<LibIssue {self.issue_id} student={self.student_id} book={self.book_id}>"


class LibReservation(Base):
    """Book reservation by a student."""

    __tablename__ = "lib_reservations"

    reservation_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(
        Integer,
        ForeignKey("sis_students.student_id"),
        nullable=False,
    )
    book_id = Column(
        Integer,
        ForeignKey("lib_books.book_id"),
        nullable=False,
    )
    reserved_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="Active")  # Active | Fulfilled | Cancelled | Expired

    # Relationships
    student = relationship("SisStudent", back_populates="reservations")
    book = relationship("LibBook", back_populates="reservations")

    def __repr__(self) -> str:
        return f"<LibReservation {self.reservation_id}>"


class LibLibrarianProfile(Base):
    """Persistent librarian profile stored by the library service."""

    __tablename__ = "lib_librarian_profiles"

    librarian_profile_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    employee_code = Column(String(20), unique=True, nullable=True)
    shift = Column(String(20), nullable=True)
    assigned_section = Column(String(100), nullable=True)
    joining_date = Column(Date, nullable=True)
    experience = Column(String(100), nullable=True)
    qualification = Column(String(150), nullable=True)
    working_hours = Column(String(100), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    profile_image_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
