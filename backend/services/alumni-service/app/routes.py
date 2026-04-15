from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import (
    AlumniJob,
    AlumniRegistry,
    AlumniEvent,
    AlumniEventRegistration,
    AlumniMentorship,
    AlumniSuccessStory,
    SISStudent,
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
)

router = APIRouter(prefix="/alumni", tags=["Alumni"])


# ---------------------------------------------------------------------------
# Alumni registration
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=AlumniOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register as alumni",
)
def register_alumni(
    body: AlumniRegisterRequest,
    current_user: dict = Depends(require_role(["alumni"])),
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

    # **SECURITY**: Verify that the authenticated user owns this student record
    if str(student.user_id) != str(current_user["user_id"]):
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

    alumni = AlumniRegistry(
        student_id=body.student_id,
        grad_year=body.grad_year,
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
def list_alumni(
    grad_year: Optional[int] = Query(None, description="Filter by graduation year"),
    employer: Optional[str] = Query(None, description="Filter by current employer"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all alumni with optional filters for graduation year and employer."""
    query = db.query(AlumniRegistry)

    if grad_year is not None:
        query = query.filter(AlumniRegistry.grad_year == grad_year)
    if employer is not None:
        query = query.filter(AlumniRegistry.current_employer.ilike(f"%{employer}%"))

    return query.all()


# ---------------------------------------------------------------------------
# Job board  (must be defined BEFORE the /{alumni_id} catch-all path)
# ---------------------------------------------------------------------------


@router.get(
    "/jobs",
    response_model=List[JobOut],
    summary="List active job postings",
)
def list_jobs(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all active and approved job postings."""
    jobs = (
        db.query(AlumniJob)
        .filter(AlumniJob.is_active == True, AlumniJob.status == "Approved")  # noqa: E712
        .order_by(AlumniJob.posted_at.desc())
        .all()
    )
    return jobs


@router.post(
    "/jobs",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
    summary="Post a job listing",
)
def create_job(
    body: JobCreate,
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

    job = AlumniJob(
        alumni_id=alumni.alumni_id,
        title=body.title,
        company=body.company,
        description=body.description,
        apply_link=body.apply_link,
        location=body.location,
        job_type=body.job_type,
        status="Pending",
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
    """Return the authenticated alumni's profile."""
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
    return alumni


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
    db.query(AlumniMentorship).filter(AlumniMentorship.alumni_id == alumni_id).delete()
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
def create_event(
    body: EventCreate,
    current_user: dict = Depends(require_role(["admin", "alumni"])),
    db: Session = Depends(get_db),
):
    """Create a new alumni event."""
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
        cover_image=body.cover_image,
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

    reg = AlumniEventRegistration(
        event_id=event_id,
        alumni_id=alumni.alumni_id,
    )
    db.add(reg)
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
def list_mentorship(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all mentorship entries."""
    return db.query(AlumniMentorship).order_by(AlumniMentorship.created_at.desc()).all()


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
def list_stories(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return approved alumni success stories."""
    return (
        db.query(AlumniSuccessStory)
        .filter(AlumniSuccessStory.status == "Approved")
        .order_by(AlumniSuccessStory.created_at.desc())
        .all()
    )


@router.post(
    "/stories",
    response_model=StoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a success story",
)
def create_story(
    body: StoryCreate,
    current_user: dict = Depends(require_role(["alumni"])),
    db: Session = Depends(get_db),
):
    """Alumni submits a success story for admin approval."""
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
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story


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
