from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import csv
import io
import httpx
import base64
import logging
from datetime import datetime, date
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from pydantic import ValidationError

logger = logging.getLogger(__name__)

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.config import settings

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
        "campusAddress": "University Campus"
    }
from app.models import (
    AlumniJob,
    AlumniRegistry,
    AlumniEvent,
    AlumniEventRegistration,
    AlumniMentorship,
    AlumniSuccessStory,
    SISStudent,
    MentorshipRequest,
    JobApplication,
)
from app.schemas import (
    AlumniOut,
    AlumniRegisterRequest,
    AlumniUpdateRequest,
    EventCreate,
    EventOut,
    JobCreate,
    JobOut,
    MentorshipCreate,
    MentorshipOut,
    MessageResponse,
    StoryCreate,
    StoryOut,
    MentorshipRequestCreate,
    MentorshipRequestOut,
    JobApplicationCreate,
    JobApplicationOut,
)

router = APIRouter(prefix="/alumni", tags=["Alumni"])
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads" / "alumni"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _public_upload_url(filename: str) -> str:
    return f"/api/v1/alumni/uploads/{filename}"


def _sanitize_filename(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return f"{uuid4().hex}{suffix}"


async def _save_uploaded_image(upload: UploadFile | None) -> Optional[str]:
    if upload is None or not upload.filename:
        return None

    if upload.content_type and not upload.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image uploads are supported",
        )

    filename = _sanitize_filename(upload.filename)
    file_path = UPLOAD_DIR / filename
    content = await upload.read()
    file_path.write_bytes(content)
    return _public_upload_url(filename)


async def _verify_degree_eligibility(student_id: int) -> bool:
    """Check SIS for Graduated status and Finance for zero balance."""
    try:
        async with httpx.AsyncClient() as client:
            # 1. Check SIS Status
            sis_url = f"{settings.GATEWAY_URL}/api/v1/sis/students/{student_id}"
            sis_resp = await client.get(sis_url, timeout=5.0)
            if sis_resp.status_code == 200:
                sis_data = sis_resp.json()
                # Verify "Graduated" status
                if sis_data.get("status") != "Graduated":
                    # Fallback check on semesters
                    program = sis_data.get("program", {})
                    total = program.get("total_semesters", 0)
                    current = sis_data.get("current_semester", 0)
                    if total == 0 or current < total:
                        return False
            else:
                return False

            # 2. Check Finance Balance
            fin_url = f"{settings.GATEWAY_URL}/api/v1/finance/invoices/student/{student_id}"
            fin_resp = await client.get(fin_url, timeout=5.0)
            if fin_resp.status_code == 200:
                invoices = fin_resp.json()
                for inv in invoices:
                    if inv.get("status") in ["Unpaid", "Overdue"]:
                        return False
            else:
                return False
            
            return True
    except Exception as e:
        logger.error(f"Cross-service verification failed: {e}")
        return False


async def _read_payload(request: Request, file_field_name: str = "cover_image_file") -> tuple[dict, UploadFile | None]:
    content_type = request.headers.get("content-type", "").lower()
    if "multipart/form-data" in content_type:
        form = await request.form()
        data = dict(form)
        upload = data.pop(file_field_name, None)
        return data, upload

    return await request.json(), None


async def _resolve_alumni_identities(alumni_records: List[AlumniRegistry]) -> dict:
    """Batch resolve names and emails for a list of alumni records via Auth Service."""
    user_ids = [str(a.student.user_id) for a in alumni_records if a.student]
    user_map = {}
    
    if user_ids:
        AUTH_SERVICE_URL = "http://auth-service:8000/api/v1/auth"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{AUTH_SERVICE_URL}/users/bulk",
                    json=user_ids,
                    timeout=5.0
                )
                if resp.status_code == 200:
                    for u_data in resp.json():
                        full_name = f"{u_data.get('first_name', '')} {u_data.get('last_name', '')}".strip()
                        user_map[u_data["user_id"]] = {
                            "name": full_name or u_data["email"],
                            "email": u_data["email"]
                        }
            except Exception as e:
                print(f"Auth Service lookup failed: {e}")
    return user_map


# ---------------------------------------------------------------------------
# Alumni registration
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=AlumniOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register as alumni",
)
async def register_alumni(
    body: AlumniRegisterRequest,
    current_user: dict = Depends(require_role(["admin", "alumni"])),
    db: Session = Depends(get_db),
):
    """
    A graduated student with the *alumni* role registers themselves in the
    alumni directory.  The provided ``student_id`` must exist in the
    ``sis_students`` table and must match the authenticated user's identity.
    """
    # Verify student exists
    student = db.query(SISStudent).filter(SISStudent.student_id == body.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found",
        )

    # Alumni users may only register themselves; admins may register any student.
    if current_user.get("role") != "admin" and str(student.user_id) != str(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only register yourself as alumni, not another student",
        )

    # Prevent duplicate registration
    existing = (
        db.query(AlumniRegistry)
        .filter(AlumniRegistry.student_id == body.student_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alumni record already exists for this student",
        )

    # Perform cross-service verification
    is_verified = await _verify_degree_eligibility(body.student_id)

    alumni = AlumniRegistry(
        student_id=body.student_id,
        grad_year=body.grad_year,
        graduation_year=body.graduation_year or body.grad_year,
        degree_verified=is_verified,
        degree=body.degree,
        current_employer=body.current_employer,
        current_position=body.current_position,
        location=body.location,
        photo_url=body.photo_url,
        linkedin_url=body.linkedin_url,
        achievements=body.achievements,
        expertise=body.expertise,
    )
    db.add(alumni)
    db.commit()
    db.refresh(alumni)
    return alumni


# ---------------------------------------------------------------------------
# Network / directory
# ---------------------------------------------------------------------------


@router.get(
    "/directory",
    response_model=List[AlumniOut],
    summary="Browse alumni network",
)
async def list_alumni(
    grad_year: Optional[int] = Query(None, description="Filter by graduation year"),
    employer: Optional[str] = Query(None, description="Filter by current employer"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all alumni with resolved names from Auth Service."""
    query = db.query(AlumniRegistry)

    if grad_year is not None:
        query = query.filter(AlumniRegistry.grad_year == grad_year)
    if employer is not None:
        query = query.filter(AlumniRegistry.current_employer.ilike(f"%{employer}%"))

    alumni_list = query.all()
    
    # ── Resolve Names via Auth Service ──
    user_map = await _resolve_alumni_identities(alumni_list)

    # Attach names to the response objects
    results = []
    for a in alumni_list:
        # Create a shallow copy or dict to add dynamic fields
        out_data = AlumniOut.model_validate(a)
        
        if a.student:
            u_info = user_map.get(str(a.student.user_id))
            if u_info:
                out_data.full_name = u_info["name"]
                out_data.email = u_info["email"]
            else:
                out_data.full_name = f"Alumni {a.alumni_id}"
        
        results.append(out_data)
    
    return results


@router.get("/export")
def export_alumni(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin"])),
):
    """Export alumni directory as CSV."""
    alumni = db.query(AlumniRegistry).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Grad Year", "Degree", "Employer", "Position", "Location", "LinkedIn"])
    
    for a in alumni:
        writer.writerow([
            a.student_id, a.grad_year, a.degree, a.current_employer,
            a.current_position, a.location, a.linkedin_url
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=alumni_directory.csv"}
    )


@router.post("/import")
async def import_alumni(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin"])),
):
    """Bulk import alumni from CSV."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV allowed")
    
    contents = await file.read()
    reader = csv.DictReader(io.StringIO(contents.decode("utf-8")))
    
    count = 0
    for row in reader:
        try:
            student_id = int(row.get("Student ID", 0))
            if not student_id: continue
            
            existing = db.query(AlumniRegistry).filter(AlumniRegistry.student_id == student_id).first()
            if not existing:
                alumni = AlumniRegistry(
                    student_id=student_id,
                    grad_year=int(row.get("Grad Year", 2024)),
                    degree=row.get("Degree"),
                    current_employer=row.get("Employer"),
                    current_position=row.get("Position"),
                    location=row.get("Location"),
                    linkedin_url=row.get("LinkedIn")
                )
                db.add(alumni)
                count += 1
        except: continue
        
    db.commit()
    return {"message": f"Imported {count} alumni records"}


# ---------------------------------------------------------------------------
# Job board  (must be defined BEFORE the /{alumni_id} catch-all path)
# ---------------------------------------------------------------------------


@router.get(
    "/jobs",
    response_model=List[JobOut],
    summary="List active job postings",
)
async def list_jobs(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all active and approved job postings with resolved identities."""
    jobs = (
        db.query(AlumniJob)
        .filter(AlumniJob.is_active == True, AlumniJob.status == "Approved")
        .order_by(AlumniJob.posted_at.desc())
        .all()
    )
    
    # Resolve identities
    alumni_records = [j.alumni for j in jobs if j.alumni]
    user_map = await _resolve_alumni_identities(alumni_records)

    results = []
    for j in jobs:
        out_data = JobOut.model_validate(j)
        if j.alumni and j.alumni.student:
            u_info = user_map.get(str(j.alumni.student.user_id))
            if u_info:
                # out_data.alumni is already populated by model_validate but we need to update full_name
                if out_data.alumni:
                    out_data.alumni.full_name = u_info["name"]
                    out_data.alumni.email = u_info["email"]
        results.append(out_data)
        
    return results


@router.post(
    "/jobs",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
    summary="Post a job listing",
)
async def create_job(
    request: Request,
    current_user: dict = Depends(require_role(["alumni"])),
    db: Session = Depends(get_db),
):
    """
    An alumnus posts a new job listing.  The job starts in *Pending* status
    until an admin approves it.  The alumni record is resolved via the
    current user's ``user_id`` joined through ``sis_students``.
    """
    # Resolve alumni_id from the authenticated user
    alumni = (
        db.query(AlumniRegistry)
        .join(SISStudent, AlumniRegistry.student_id == SISStudent.student_id)
        .filter(SISStudent.user_id == current_user["user_id"])
        .first()
    )
    if not alumni:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumni profile not found for the current user. Register first.",
        )

    payload, upload = await _read_payload(request)

    try:
        body = JobCreate.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())

    cover_image = body.cover_image
    if upload is not None:
        cover_image = await _save_uploaded_image(upload)

    job = AlumniJob(
        alumni_id=alumni.alumni_id,
        title=body.title,
        company=body.company,
        description=body.description,
        apply_link=body.apply_link,
        location=body.location,
        job_type=body.job_type,
        cover_image=cover_image,
        status="Approved",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put(
    "/jobs/{job_id}/approve",
    response_model=MessageResponse,
    summary="Approve a job posting",
)
def approve_job(
    job_id: int,
    current_user: dict = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Admin approves a pending job posting."""
    job = db.query(AlumniJob).filter(AlumniJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found",
        )

    job.status = "Approved"
    db.commit()
    return MessageResponse(message=f"Job posting {job_id} approved successfully")


# ---------------------------------------------------------------------------
# Alumni profile update
# ---------------------------------------------------------------------------


@router.put(
    "/profile",
    response_model=AlumniOut,
    summary="Update alumni profile",
)
def update_alumni_profile(
    body: AlumniUpdateRequest,
    current_user: dict = Depends(require_role(["alumni"])),
    db: Session = Depends(get_db),
):
    """Update the authenticated alumni's profile."""
    alumni = (
        db.query(AlumniRegistry)
        .join(SISStudent, AlumniRegistry.student_id == SISStudent.student_id)
        .filter(SISStudent.user_id == current_user["user_id"])
        .first()
    )
    if not alumni:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumni profile not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alumni, field, value)

    db.commit()
    db.refresh(alumni)
    return alumni


@router.get(
    "/profile",
    response_model=AlumniOut,
    summary="Get alumni profile",
)
def get_alumni_profile(
    current_user: dict = Depends(require_role(["alumni"])),
    db: Session = Depends(get_db),
):
    """Return the authenticated alumni's profile with resolved identity."""
    alumni = (
        db.query(AlumniRegistry)
        .join(SISStudent, AlumniRegistry.student_id == SISStudent.student_id)
        .filter(SISStudent.user_id == current_user["user_id"])
        .first()
    )
    if not alumni:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumni profile not found",
        )
    
    out_data = AlumniOut.model_validate(alumni)
    out_data.full_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user.get("email")
    out_data.email = current_user.get("email")
    
    return out_data


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Alumni admin update & delete
# ---------------------------------------------------------------------------


@router.put(
    "/{alumni_id}",
    response_model=AlumniOut,
    summary="Admin update alumni profile",
)
def update_alumni_admin(
    alumni_id: int,
    body: AlumniUpdateRequest,
    current_user: dict = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Admin updates an alumni's profile."""
    alumni = db.query(AlumniRegistry).filter(AlumniRegistry.alumni_id == alumni_id).first()
    if not alumni:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumni record not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alumni, field, value)

    db.commit()
    db.refresh(alumni)
    return alumni


@router.delete(
    "/{alumni_id}",
    response_model=MessageResponse,
    summary="Admin delete alumni profile",
)
def delete_alumni_admin(
    alumni_id: int,
    current_user: dict = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Admin deletes an alumni's profile and related records."""
    alumni = db.query(AlumniRegistry).filter(AlumniRegistry.alumni_id == alumni_id).first()
    if not alumni:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumni record not found",
        )

    # Delete related records
    db.query(AlumniJob).filter(AlumniJob.alumni_id == alumni_id).delete()
    db.query(AlumniMentorship).filter(AlumniMentorship.mentor_id == alumni_id).delete()
    db.query(AlumniSuccessStory).filter(AlumniSuccessStory.alumni_id == alumni_id).delete()

    # Delete alumni record
    db.delete(alumni)
    db.commit()
    return MessageResponse(message=f"Alumni {alumni_id} deleted successfully")



@router.get(
    "/events",
    response_model=List[EventOut],
    summary="List alumni events",
)
def list_events(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all alumni events ordered by date."""
    return db.query(AlumniEvent).order_by(AlumniEvent.event_date.desc()).all()


@router.post(
    "/events",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an alumni event",
)
async def create_event(
    request: Request,
    current_user: dict = Depends(require_role(["admin", "alumni"])),
    db: Session = Depends(get_db),
):
    """Create a new alumni event."""
    payload, upload = await _read_payload(request)
    try:
        body = EventCreate.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())

    cover_image = body.cover_image
    if upload is not None:
        cover_image = await _save_uploaded_image(upload)

    event = AlumniEvent(
        title=body.title,
        description=body.description,
        event_date=body.event_date,
        event_time=body.event_time,
        venue=body.venue,
        event_type=body.event_type,
        capacity=body.capacity,
        fee=body.fee,
        organizer=body.organizer,
        cover_image=cover_image,
        created_by=current_user["user_id"],
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post(
    "/events/{event_id}/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register for an alumni event",
)
def register_for_event(
    event_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register the current user for an alumni event."""
    event = db.query(AlumniEvent).filter(AlumniEvent.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Resolve alumni_id from user_id
    alumni = (
        db.query(AlumniRegistry)
        .join(SISStudent, AlumniRegistry.student_id == SISStudent.student_id)
        .filter(SISStudent.user_id == current_user["user_id"])
        .first()
    )
    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni profile not found")

    existing = (
        db.query(AlumniEventRegistration)
        .filter(
            AlumniEventRegistration.event_id == event_id,
            AlumniEventRegistration.alumni_id == alumni.alumni_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already registered")

    if event.capacity is not None and event.registered_count >= event.capacity:
        raise HTTPException(status_code=400, detail="Event is already full")

    reg = AlumniEventRegistration(
        event_id=event_id,
        alumni_id=alumni.alumni_id,
    )
    db.add(reg)
    
    # Increment registered count
    event.registered_count += 1
    
    db.commit()
    return MessageResponse(message="Successfully registered for event")


# ---------------------------------------------------------------------------
# Mentorship
# ---------------------------------------------------------------------------


@router.get(
    "/mentorship",
    response_model=List[MentorshipOut],
    summary="List mentorship entries",
)
async def list_mentorship(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all mentorship entries with resolved identities."""
    entries = db.query(AlumniMentorship).order_by(AlumniMentorship.created_at.desc()).all()
    
    # Resolve identities
    alumni_records = [e.alumni for e in entries if e.alumni]
    user_map = await _resolve_alumni_identities(alumni_records)
    
    results = []
    for e in entries:
        out_data = MentorshipOut.model_validate(e)
        if e.alumni and e.alumni.student:
            u_info = user_map.get(str(e.alumni.student.user_id))
            if u_info:
                if out_data.alumni:
                    out_data.alumni.full_name = u_info["name"]
                    out_data.alumni.email = u_info["email"]
        results.append(out_data)
        
    return results


@router.post(
    "/mentorship",
    response_model=MentorshipOut,
    status_code=status.HTTP_201_CREATED,
    summary="Offer or request mentorship",
)
def create_mentorship(
    body: MentorshipCreate,
    current_user: dict = Depends(require_role(["alumni"])),
    db: Session = Depends(get_db),
):
    """Alumni offers mentorship."""
    alumni = (
        db.query(AlumniRegistry)
        .join(SISStudent, AlumniRegistry.student_id == SISStudent.student_id)
        .filter(SISStudent.user_id == current_user["user_id"])
        .first()
    )
    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni profile not found")

    mentorship = AlumniMentorship(
        mentor_id=alumni.alumni_id,
        specialization=body.specialization,
        bio=body.bio,
        available_slots=body.available_slots,
    )
    try:
        db.add(mentorship)
        db.commit()
        db.refresh(mentorship)
    except Exception as exc:
        db.rollback()
        if "unique constraint" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mentorship profile already exists for this alumni",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create mentorship profile",
        )
    return mentorship


# ---------------------------------------------------------------------------
# Success Stories
# ---------------------------------------------------------------------------


@router.get(
    "/stories",
    response_model=List[StoryOut],
    summary="List approved success stories",
)
async def list_stories(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return approved alumni success stories with resolved identities."""
    stories = (
        db.query(AlumniSuccessStory)
        .filter(AlumniSuccessStory.status == "Approved")
        .order_by(AlumniSuccessStory.created_at.desc())
        .all()
    )
    
    # Resolve identities
    alumni_records = [s.alumni for s in stories if s.alumni]
    user_map = await _resolve_alumni_identities(alumni_records)
    
    results = []
    for s in stories:
        out_data = StoryOut.model_validate(s)
        if s.alumni and s.alumni.student:
            u_info = user_map.get(str(s.alumni.student.user_id))
            if u_info:
                if out_data.alumni:
                    out_data.alumni.full_name = u_info["name"]
                    out_data.alumni.email = u_info["email"]
        results.append(out_data)
        
    return results


@router.post(
    "/stories",
    response_model=StoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a success story",
)
async def create_story(
    request: Request,
    current_user: dict = Depends(require_role(["alumni"])),
    db: Session = Depends(get_db),
):
    """Alumni submits a success story for admin approval."""
    payload, upload = await _read_payload(request)
    try:
        body = StoryCreate.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())

    cover_image = body.cover_image
    if upload is not None:
        cover_image = await _save_uploaded_image(upload)

    alumni = (
        db.query(AlumniRegistry)
        .join(SISStudent, AlumniRegistry.student_id == SISStudent.student_id)
        .filter(SISStudent.user_id == current_user["user_id"])
        .first()
    )
    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni profile not found")

    story = AlumniSuccessStory(
        alumni_id=alumni.alumni_id,
        title=body.title,
        content=body.content,
        cover_image=cover_image,
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story


@router.get(
    "/uploads/{filename}",
    include_in_schema=False,
)
def get_uploaded_image(filename: str):
    file_path = UPLOAD_DIR / Path(filename).name
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return FileResponse(file_path)


@router.get("/reports/pdf")
async def download_alumni_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin"])),
):
    """Generate alumni engagement report as PDF."""
    total_alumni = db.query(AlumniRegistry).count()
    events = db.query(AlumniEvent).all()
    jobs = db.query(AlumniJob).filter(AlumniJob.status == "Approved").count()

    campus_info = await _get_global_settings()
    university_name = campus_info.get("campusName", "Punjab University Gujranwala Campus")
    university_address = campus_info.get("campusAddress", "University Campus")
    logo_data = campus_info.get("campusLogo")

    # --- PROFESSIONAL ALUMNI REPORT REDESIGN (V2) ---
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
            logger.error("Failed to draw logo in Alumni: %s", e)

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
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawRightString(width - margin, height - 2.0 * cm, "ALUMNI REPORT")
    pdf.setFont("Helvetica", 10)
    pdf.drawRightString(width - margin, height - 2.8 * cm, "Engagement & Network Activity")
    pdf.drawRightString(width - margin, height - 3.3 * cm, f"DATE: {datetime.now().strftime('%d %b %Y')}")

    # Separator Line
    pdf.setStrokeColorRGB(0.8, 0.8, 0.8)
    pdf.setLineWidth(0.5)
    pdf.line(margin, height - 4.0 * cm, width - margin, height - 4.0 * cm)

    # 2. Key Metrics Section
    y = height - 5.0 * cm
    pdf.setFont("Helvetica-Bold", 11)
    pdf.setFillColorRGB(0.4, 0.4, 0.4)
    pdf.drawString(margin, y, "NETWORK SNAPSHOT")

    y -= 0.8 * cm
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margin, y, f"Total Registered Alumni: {total_alumni}")
    pdf.drawRightString(width - margin, y, f"Active Job Postings: {jobs}")

    # 3. Events Table
    y -= 1.5 * cm
    pdf.setFont("Helvetica-Bold", 11)
    pdf.setFillColorRGB(0.4, 0.4, 0.4)
    pdf.drawString(margin, y, "UPCOMING EVENTS & ACTIVITY")

    y -= 0.8 * cm
    pdf.setFillColorRGB(0.3, 0.3, 0.3)
    pdf.rect(margin, y - 0.2 * cm, content_width, 0.8 * cm, fill=1, stroke=0)
    pdf.setFillColorRGB(1, 1, 1)

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(margin + 0.5 * cm, y + 0.1 * cm, "Event Title")
    pdf.drawCentredString(width / 2 + 1 * cm, y + 0.1 * cm, "Date")
    pdf.drawRightString(width - margin - 0.5 * cm, y + 0.1 * cm, "Attendees")

    y -= 0.8 * cm
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica", 9)
    for event in events:
        if y < 3 * cm:
            pdf.showPage()
            y = height - 2 * cm
            pdf.setFont("Helvetica", 9)

        pdf.setStrokeColorRGB(0.9, 0.9, 0.9)
        pdf.line(margin, y - 0.2 * cm, width - margin, y - 0.2 * cm)

        pdf.drawString(margin + 0.5 * cm, y, event.title[:55])
        pdf.drawCentredString(width / 2 + 1 * cm, y, event.event_date.strftime("%Y-%m-%d"))
        pdf.drawRightString(width - margin - 0.5 * cm, y, str(event.registered_count))
        y -= 0.7 * cm

    # 4. Footer
    pdf.setFillColorRGB(0.5, 0.5, 0.5)
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawCentredString(width/2, margin, "This is a computer generated report and does not require a physical signature.")
    pdf.drawCentredString(width/2, margin - 0.4 * cm, f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    pdf.save()

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=alumni_report.pdf"}
    )


@router.put(
    "/stories/{story_id}/approve",
    response_model=MessageResponse,
    summary="Approve a success story",
)
def approve_story(
    story_id: int,
    current_user: dict = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Admin approves a success story."""
    story = (
        db.query(AlumniSuccessStory)
        .filter(AlumniSuccessStory.story_id == story_id)
        .first()
    )
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    story.status = "Approved"
    db.commit()
    return MessageResponse(message=f"Story {story_id} approved successfully")


# ---------------------------------------------------------------------------
# Mentorship Requests
# ---------------------------------------------------------------------------


@router.post(
    "/mentorship-requests",
    response_model=MentorshipRequestOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a mentorship request",
)
def submit_mentorship_request(
    body: MentorshipRequestCreate,
    current_user: dict = Depends(require_role(["student"])),
    db: Session = Depends(get_db),
):
    """A student requests mentorship from an alumnus."""
    student = db.query(SISStudent).filter(SISStudent.user_id == current_user["user_id"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    request = MentorshipRequest(
        student_id=student.student_id,
        alumni_id=body.alumni_id,
        message=body.message,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


# ---------------------------------------------------------------------------
# Job Applications
# ---------------------------------------------------------------------------


@router.post(
    "/jobs/apply",
    response_model=JobApplicationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for a job",
)
def apply_for_job(
    body: JobApplicationCreate,
    current_user: dict = Depends(require_role(["student"])),
    db: Session = Depends(get_db),
):
    """A student applies for a job posted by an alumnus."""
    student = db.query(SISStudent).filter(SISStudent.user_id == current_user["user_id"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    application = JobApplication(
        job_id=body.job_id,
        student_id=student.student_id,
        resume_url=body.resume_url,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


# ---------------------------------------------------------------------------
# Alumni profile by ID (catch-all path -- must be LAST)
# ---------------------------------------------------------------------------


@router.get(
    "/{alumni_id}",
    response_model=AlumniOut,
    summary="View alumni profile",
)
def get_alumni(
    alumni_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single alumni profile by ID."""
    alumni = (
        db.query(AlumniRegistry)
        .filter(AlumniRegistry.alumni_id == alumni_id)
        .first()
    )
    if not alumni:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumni not found",
        )
    return alumni
