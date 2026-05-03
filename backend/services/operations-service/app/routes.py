import json
import hashlib
import httpx
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, mongo_db, redis_client
from app.dependencies import get_current_user, require_role
from app.models import OpsGrievance, OpsGrievanceComment, SisStudent, AuthUser, AuthRole, AuthUserRole
from app.nlp_router import route_grievance
from app.schemas import (
    AnnouncementCreate,
    AnnouncementCommentCreate,
    AnnouncementCommentOut,
    AnnouncementOut,
    AnnouncementUpdate,
    AuditTrailCreate,
    AuditTrailOut,
    GrievanceCreate,
    GrievanceOut,
    GrievanceStatusUpdate,
    GrievanceCommentCreate,
    GrievanceCommentOut,
    MediaAssetCreate,
    MediaAssetOut,
    MessageResponse,
    NotificationCreate,
    NotificationOut,
    SystemLogCreate,
    SystemLogOut,
)

router = APIRouter(prefix="/ops", tags=["Operations"])

RATE_LIMIT_PER_MINUTE = 100
QUERY_CACHE_TTL_SECONDS = 600


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def _enforce_rate_limit(request: Request) -> None:
    """Redis-backed API rate limit (FYP Table 146)."""
    ip = _client_ip(request)
    endpoint = request.url.path
    key = f"ratelimit:{ip}:{endpoint}"

    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 60)

    if count > RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again in a minute.",
        )


def _build_query_cache_key(endpoint: str, params: dict) -> str:
    payload = {"endpoint": endpoint, "params": params}
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()
    return f"query:{digest}"


async def _get_cached_query_result(cache_key: str):
    cached = await redis_client.get(cache_key)
    if not cached:
        return None
    try:
        return json.loads(cached)
    except json.JSONDecodeError:
        return None


async def _set_cached_query_result(cache_key: str, payload) -> None:
    await redis_client.setex(cache_key, QUERY_CACHE_TTL_SECONDS, json.dumps(payload, default=str))


async def _invalidate_query_cache() -> None:
    async for key in redis_client.scan_iter(match="query:*"):
        await redis_client.delete(key)


async def _resolve_announcement_comments(raw_comments: list[dict]) -> list[dict]:
    author_ids = [str(comment.get("user_id", "")) for comment in raw_comments if comment.get("user_id")]
    identities = await _resolve_identities(list(set(author_ids)))
    resolved = []
    for comment in raw_comments:
        user_id = str(comment.get("user_id", ""))
        ident = identities.get(user_id, {})
        resolved.append({
            "comment_id": str(comment.get("comment_id") or comment.get("id") or comment.get("_id") or comment.get("created_at")),
            "user_id": user_id,
            "author_name": ident.get("full_name") or ident.get("name") or comment.get("author_name") or "User",
            "author_avatar": ident.get("avatar") or comment.get("author_avatar"),
            "comment": comment.get("comment", ""),
            "created_at": comment.get("created_at", datetime.utcnow().isoformat()),
        })
    return resolved


async def _announcement_to_out(doc: dict, *, author_name: str = "System", author_avatar: str | None = None) -> AnnouncementOut:
    comments = doc.get("comments", []) or []
    return AnnouncementOut(
        id=str(doc["_id"]),
        title=doc["title"],
        content=doc["content"],
        course_id=doc.get("course_id"),
        author_id=str(doc.get("author_id", doc.get("created_by", ""))),
        author_name=author_name,
        author_avatar=author_avatar,
        target_audience=doc.get("target_audience", ["all"]),
        target_programs=doc.get("target_programs"),
        target_semesters=doc.get("target_semesters"),
        priority=doc.get("priority", "medium"),
        published_at=doc.get("published_at", doc.get("created_at", "")),
        expires_at=doc.get("expires_at"),
        is_pinned=doc.get("is_pinned", False),
        attachments=doc.get("attachments", []),
        view_count=int(doc.get("view_count", 0) or 0),
        likes_count=int(doc.get("likes_count", 0) or 0),
        comments_count=int(doc.get("comments_count", len(comments)) or len(comments)),
        comments=await _resolve_announcement_comments(comments),
    )

# ---------------------------------------------------------------------------
# MongoDB collection references (FYP spec collections)
# ---------------------------------------------------------------------------
announcements_collection = mongo_db["content_announcements"]
audit_trails_collection = mongo_db["audit_trails"]
media_assets_collection = mongo_db["media_assets"]
notifications_collection = mongo_db["notifications"]
system_logs_collection = mongo_db["system_logs"]


# ── Grievances ────────────────────────────────────────────────────────────

@router.post("/grievances", response_model=GrievanceOut, status_code=status.HTTP_201_CREATED)
def create_grievance(
    payload: GrievanceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Find student_id from user_id
    student = db.query(SisStudent).filter(
        SisStudent.user_id == str(current_user["user_id"])
    ).first()
    student_id = student.student_id if student else None

    # Auto-route using NLP, but never let routing failures break grievance creation
    try:
        routing = route_grievance(payload.description)
    except Exception:
        routing = {"department": "General Administration", "is_urgent": False}

    grievance = OpsGrievance(
        student_id=student_id,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        assigned_department=routing.get("department", "General Administration"),
        is_urgent=bool(routing.get("is_urgent", False)),
        priority="High" if routing.get("is_urgent") else "Normal",
    )
    db.add(grievance)
    db.commit()
    db.refresh(grievance)
    return grievance


@router.get("/grievances/me", response_model=list[GrievanceOut])
async def my_grievances(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return current user's grievances with resolved comment identities."""
    student = db.query(SisStudent).filter(
        SisStudent.user_id == current_user["user_id"]
    ).first()
    if not student:
        return []
    
    grievances = (
        db.query(OpsGrievance)
        .filter(OpsGrievance.student_id == student.student_id)
        .order_by(OpsGrievance.created_at.desc())
        .all()
    )

    # Collect all author_ids from all comments of all grievances
    author_ids = []
    for g in grievances:
        for c in g.comments:
            if c.author_id:
                author_ids.append(str(c.author_id))

    # Also resolve author_id of the grievance itself if needed, 
    # but the requirement was for comments.

    identities = await _resolve_identities(list(set(author_ids)))

    for g in grievances:
        g.ticket_id = g.ticket_id or g.id
        for c in g.comments:
            ident = identities.get(str(c.author_id), {})
            c.author_name = ident.get("full_name") or ident.get("name") or "User"
            c.author_avatar = ident.get("avatar")
            c.user_id = str(c.author_id)
            c.comment = c.text
    return grievances


@router.get("/grievances", response_model=list[GrievanceOut])
async def list_grievances(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hod", "faculty", "librarian")),
):
    """Admin view to list grievances with resolved student and comment identities."""
    query = db.query(
        OpsGrievance,
        AuthUser.first_name,
        AuthUser.last_name,
        SisStudent.roll_no
    ).join(
        SisStudent, OpsGrievance.student_id == SisStudent.student_id, isouter=True
    ).join(
        AuthUser, SisStudent.user_id == AuthUser.user_id, isouter=True
    )

    if status_filter:
        query = query.filter(OpsGrievance.status == status_filter)
    
    results = query.order_by(OpsGrievance.created_at.desc()).all()
    
    # Collect all author_ids for comment resolution
    author_ids = []
    for g, _, _, _ in results:
        for c in g.comments:
            author_ids.append(str(c.author_id))
    
    identities = await _resolve_identities(list(set(author_ids)))

    out = []
    for g, fname, lname, roll in results:
        g.student_name = f"{fname or ''} {lname or ''}".strip() or "Unknown Student"
        g.student_roll_no = roll or "N/A"
        
        # Resolve comment identities
        for c in g.comments:
            ident = identities.get(str(c.author_id), {})
            c.author_name = ident.get("full_name") or ident.get("name") or "User"
            c.author_avatar = ident.get("avatar")
            c.user_id = str(c.author_id)
            c.comment = c.text
            
        out.append(g)
    return out


@router.put("/grievances/{ticket_id}/status", response_model=GrievanceOut)
def update_grievance_status(
    ticket_id: int,
    payload: GrievanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hod", "faculty")),
):
    grievance = db.query(OpsGrievance).filter(OpsGrievance.ticket_id == ticket_id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    grievance.status = payload.status
    if payload.resolution:
        grievance.resolution = payload.resolution

    # Auto-escalate if high priority and older than 48 hours
    if grievance.created_at:
        hours_elapsed = (datetime.utcnow() - grievance.created_at).total_seconds() / 3600
        if grievance.is_urgent and hours_elapsed > 48 and payload.status != "Resolved":
            grievance.priority = "Escalated"

    db.commit()
    db.refresh(grievance)
    return grievance


# ── Announcements (MongoDB — FYP Table 140) ──────────────────────────────

@router.post("/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "faculty", "student")),
):
    now = datetime.utcnow().isoformat()
    doc = {
        "title": payload.title,
        "content": payload.content,
        "course_id": payload.course_id,
        "author_id": current_user["user_id"],
        "target_audience": payload.target_audience,
        "target_programs": payload.target_programs,
        "target_semesters": payload.target_semesters,
        "priority": payload.priority,
        "published_at": now,
        "expires_at": None,
        "is_pinned": payload.is_pinned,
        "attachments": payload.attachments,
        "view_count": 0,
        "likes_count": 0,
        "liked_by": [],
        "comments_count": 0,
        "comments": [],
    }
    result = await announcements_collection.insert_one(doc)
    announcement_id = str(result.inserted_id)

    # ── Broadcast Notifications ──
    try:
        audiences = payload.target_audience
        # Filter users by role
        users_query = db.query(AuthUser.user_id)
        if "all" not in audiences:
            users_query = (
                users_query
                .join(AuthUserRole, AuthUser.user_id == AuthUserRole.user_id)
                .join(AuthRole, AuthUserRole.role_id == AuthRole.role_id)
                .filter(AuthRole.role_name.in_(audiences))
            )
        
        target_user_ids = [str(u.user_id) for u in users_query.distinct().all()]
        
        # ── Cross-Service Notification Delivery (Audit Fix) ──
        notif_payloads = [
            {
                "user_id": uid,
                "title": f"New Announcement: {payload.title}",
                "message": payload.content[:100] + "..." if len(payload.content) > 100 else payload.content,
                "type": "announcement",
                "priority": payload.priority,
                "action_url": f"/dashboard",
                "metadata": {"announcement_id": announcement_id}
            }
            for uid in target_user_ids
        ]
        
        if notif_payloads:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.NOTIFICATION_SERVICE_URL}/api/v1/notify/internal/notifications/bulk",
                    json=notif_payloads,
                    headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY},
                    timeout=10.0
                )
    except Exception as e:
        print(f"Failed to broadcast notifications: {e}")

    await _invalidate_query_cache()
    return await _announcement_to_out({"_id": ObjectId(announcement_id), **doc})


import logging

logger = logging.getLogger(__name__)

async def _resolve_identities(user_ids: list[str]) -> dict:
    """Batch resolve UUID user_ids to {uuid: {name, email, avatar}} via Auth Service."""
    if not user_ids:
        return {}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.GATEWAY_URL}/api/v1/auth/users/bulk",
                json={"user_ids": user_ids},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                return {u["user_id"]: u for u in data}
    except Exception as exc:
        logger.error("Identity resolution failed: %s", exc)
    return {}


@router.get("/announcements", response_model=list[AnnouncementOut])
async def list_announcements(
    request: Request,
    course_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await _enforce_rate_limit(request)
    role = current_user["role"]
    cache_key = _build_query_cache_key(
        "/ops/announcements",
        {"role": role, "course_id": course_id},
    )
    cached_payload = await _get_cached_query_result(cache_key)
    if cached_payload:
        return [AnnouncementOut(**item) for item in cached_payload]

    query_filter = {"target_audience": {"$in": [role, "all"]}}
    if course_id:
        query_filter["course_id"] = course_id

    cursor = announcements_collection.find(query_filter).sort(
        [("is_pinned", -1), ("published_at", -1)]
    )
    results_raw = []
    author_ids = []
    async for doc in cursor:
        results_raw.append(doc)
        author_id = doc.get("author_id", doc.get("created_by", ""))
        if author_id:
            author_ids.append(str(author_id))

    # Resolve identities
    identities = await _resolve_identities(list(set(author_ids)))

    results = []
    for doc in results_raw:
        author_id = str(doc.get("author_id", doc.get("created_by", "")))
        ident = identities.get(author_id, {})
        results.append(await _announcement_to_out(
            doc,
            author_name=ident.get("full_name") or ident.get("name") or "System",
            author_avatar=ident.get("avatar"),
        ))

    await _set_cached_query_result(cache_key, [item.model_dump() for item in results])
    return results


@router.get("/announcements/{announcement_id}", response_model=AnnouncementOut)
async def get_announcement(
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
):
    cache_key = _build_query_cache_key(
        "/ops/announcements/{id}",
        {"announcement_id": announcement_id, "role": current_user.get("role", "")},
    )
    cached_payload = await _get_cached_query_result(cache_key)
    if cached_payload:
        # Keep view-count behavior while still serving cached payload.
        await announcements_collection.update_one(
            {"_id": ObjectId(announcement_id)}, {"$inc": {"view_count": 1}}
        )
        cached_payload["view_count"] = int(cached_payload.get("view_count", 0)) + 1
        return AnnouncementOut(**cached_payload)

    doc = await announcements_collection.find_one({"_id": ObjectId(announcement_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Announcement not found")
    author_id = str(doc.get("author_id", doc.get("created_by", "")))
    identities = await _resolve_identities([author_id]) if author_id else {}
    # Increment view_count
    await announcements_collection.update_one(
        {"_id": ObjectId(announcement_id)}, {"$inc": {"view_count": 1}}
    )
    ident = identities.get(author_id, {})
    response = await _announcement_to_out(
        doc,
        author_name=ident.get("full_name") or ident.get("name") or "System",
        author_avatar=ident.get("avatar"),
    )
    response.view_count = int(doc.get("view_count", 0) or 0) + 1
    await _set_cached_query_result(cache_key, response.model_dump())
    return response


@router.put("/announcements/{announcement_id}", response_model=AnnouncementOut)
async def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdate,
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    try:
        object_id = ObjectId(announcement_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    existing = await announcements_collection.find_one({"_id": object_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Announcement not found")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        await announcements_collection.update_one({"_id": object_id}, {"$set": update_data})

    doc = await announcements_collection.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Announcement not found")
    author_id = str(doc.get("author_id", doc.get("created_by", "")))
    identities = await _resolve_identities([author_id]) if author_id else {}

    await _invalidate_query_cache()
    ident = identities.get(author_id, {})
    return await _announcement_to_out(
        doc,
        author_name=ident.get("full_name") or ident.get("name") or "System",
        author_avatar=ident.get("avatar"),
    )


@router.delete("/announcements/{announcement_id}", response_model=MessageResponse)
async def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(require_role("admin")),
):
    result = await announcements_collection.delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await _invalidate_query_cache()
    return MessageResponse(message="Announcement deleted successfully")


@router.post("/announcements/{announcement_id}/like", response_model=AnnouncementOut)
async def like_announcement(
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(announcement_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    doc = await announcements_collection.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Announcement not found")

    user_id = str(current_user["user_id"])
    liked_by = [str(item) for item in doc.get("liked_by", [])]
    if user_id in liked_by:
        liked_by = [item for item in liked_by if item != user_id]
        likes_count = max(0, int(doc.get("likes_count", 0) or 0) - 1)
    else:
        liked_by.append(user_id)
        likes_count = int(doc.get("likes_count", 0) or 0) + 1

    await announcements_collection.update_one(
        {"_id": object_id},
        {"$set": {"liked_by": liked_by, "likes_count": likes_count}},
    )
    await _invalidate_query_cache()
    updated = await announcements_collection.find_one({"_id": object_id})
    return await _announcement_to_out(updated)


@router.get("/announcements/{announcement_id}/comments", response_model=list[AnnouncementCommentOut])
async def list_announcement_comments(
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(announcement_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    doc = await announcements_collection.find_one({"_id": object_id}, {"comments": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Announcement not found")
    comments = await _resolve_announcement_comments(doc.get("comments", []) or [])
    return [AnnouncementCommentOut(**item) for item in comments]


@router.post("/announcements/{announcement_id}/comments", response_model=AnnouncementCommentOut, status_code=status.HTTP_201_CREATED)
async def add_announcement_comment(
    announcement_id: str,
    payload: AnnouncementCommentCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(announcement_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    if not payload.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    doc = await announcements_collection.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Announcement not found")

    comment_doc = {
        "comment_id": str(ObjectId()),
        "user_id": str(current_user["user_id"]),
        "comment": payload.comment.strip(),
        "created_at": datetime.utcnow().isoformat(),
    }

    await announcements_collection.update_one(
        {"_id": object_id},
        {
            "$push": {"comments": comment_doc},
            "$inc": {"comments_count": 1},
        },
    )
    await _invalidate_query_cache()

    ident = await _resolve_identities([str(current_user["user_id"])] )
    resolved = await _resolve_announcement_comments([comment_doc])
    return AnnouncementCommentOut(**resolved[0])


# ── Grievance Comments ────────────────────────────────────────────────────

@router.get("/grievances/{ticket_id}/comments", response_model=list[GrievanceCommentOut])
async def list_grievance_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List comments on a grievance with resolved identities."""
    comments = (
        db.query(OpsGrievanceComment)
        .filter(OpsGrievanceComment.ticket_id == ticket_id)
        .order_by(OpsGrievanceComment.created_at.asc())
        .all()
    )

    author_ids = [str(c.author_id) for c in comments]
    identities = await _resolve_identities(list(set(author_ids)))

    return [
        GrievanceCommentOut(
            comment_id=comment.comment_id,
            ticket_id=comment.ticket_id,
            user_id=str(comment.author_id),
            author_name=identities.get(str(comment.author_id), {}).get("full_name") or identities.get(str(comment.author_id), {}).get("name") or "User",
            author_avatar=identities.get(str(comment.author_id), {}).get("avatar"),
            comment=comment.text,
            created_at=comment.created_at,
        )
        for comment in comments
    ]


@router.post(
    "/grievances/{ticket_id}/comments",
    response_model=GrievanceCommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_grievance_comment(
    ticket_id: int,
    payload: GrievanceCommentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add a comment to a grievance with resolved identity in response."""
    grievance = db.query(OpsGrievance).filter(OpsGrievance.ticket_id == ticket_id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    comment = OpsGrievanceComment(
        ticket_id=ticket_id,
        author_id=current_user["user_id"],
        author_role=current_user["role"],
        text=payload.comment,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Single identity resolution for response
    identities = await _resolve_identities([str(current_user["user_id"])])
    ident = identities.get(str(current_user["user_id"]), {})

    return GrievanceCommentOut(
        comment_id=comment.comment_id,
        ticket_id=comment.ticket_id,
        user_id=str(comment.author_id),
        author_name=ident.get("full_name") or ident.get("name") or current_user.get("name") or "You",
        author_avatar=ident.get("avatar"),
        comment=comment.text,
        created_at=comment.created_at,
    )


# ═══════════════════════════════════════════════════════════════════════════
# AUDIT TRAILS  (MongoDB — FYP Table 136)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/audit-trails", response_model=AuditTrailOut, status_code=status.HTTP_201_CREATED)
async def create_audit_trail(
    payload: AuditTrailCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Record an audit trail entry for any entity change."""
    doc = {
        "action": payload.action,
        "user_id": current_user["user_id"],
        "target_entity": payload.target_entity,
        "entity_id": payload.entity_id,
        "old_value": payload.old_value,
        "new_value": payload.new_value,
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "timestamp": datetime.utcnow().isoformat(),
        "severity": payload.severity,
    }
    result = await audit_trails_collection.insert_one(doc)
    return AuditTrailOut(id=str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"})


@router.get("/audit-trails", response_model=list[AuditTrailOut])
async def list_audit_trails(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    target_entity: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(require_role("admin")),
):
    """List audit trail entries with resolved identities."""
    query_filter: dict = {}
    if user_id:
        query_filter["user_id"] = user_id
    if action:
        query_filter["action"] = action
    if target_entity:
        query_filter["target_entity"] = target_entity

    cursor = audit_trails_collection.find(query_filter).sort("timestamp", -1).limit(limit)
    results_raw = []
    user_ids = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results_raw.append(doc)
        if "user_id" in doc:
            user_ids.append(str(doc["user_id"]))

    # Resolve identities
    identities = await _resolve_identities(list(set(user_ids)))

    results = []
    for doc in results_raw:
        uid = str(doc.get("user_id", ""))
        ident = identities.get(uid, {})
        doc["user_name"] = ident.get("full_name") or ident.get("name") or "System"
        results.append(AuditTrailOut(**doc))
    return results


# ═══════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS  (MongoDB — FYP Table 138)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/notifications", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreate,
    request: Request,
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    """Create a notification for a specific user (via Notification Service)."""
    await _enforce_rate_limit(request)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.NOTIFICATION_SERVICE_URL}/api/v1/notify/internal/notifications",
            json=payload.model_dump(),
            headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY},
            timeout=5.0
        )
        if resp.status_code != 201:
            raise HTTPException(status_code=resp.status_code, detail="Failed to create notification via external service")
        
        data = resp.json()
        return NotificationOut(**data)


@router.get("/notifications/me", response_model=list[NotificationOut])
async def my_notifications(
    is_read: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's notifications (via Notification Service)."""
    async with httpx.AsyncClient() as client:
        params = {"limit": limit}
        if is_read is not None:
            params["is_read"] = is_read
        
        # We use the user's token or just an internal call with user_id context.
        # Since we have internal access, let's just use the notification service's own user endpoint
        # but we need to authenticate as that user or use an internal override.
        # Actually, it's easier to just tell the frontend to use the correct endpoint.
        # But for backward compatibility:
        resp = await client.get(
            f"{settings.NOTIFICATION_SERVICE_URL}/api/v1/notify/notifications/me",
            headers={"Authorization": f"Bearer {current_user['token']}"} if "token" in current_user else {},
            params=params,
            timeout=5.0
        )
        if resp.status_code != 200:
            return []
        return resp.json()


@router.put("/notifications/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a single notification as read (via Notification Service)."""
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{settings.NOTIFICATION_SERVICE_URL}/api/v1/notify/notifications/{notification_id}/read",
            headers={"Authorization": f"Bearer {current_user['token']}"} if "token" in current_user else {},
            timeout=5.0
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to update notification")
        return resp.json()


@router.put("/notifications/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
):
    """Mark all unread notifications as read (via Notification Service)."""
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{settings.NOTIFICATION_SERVICE_URL}/api/v1/notify/notifications/read-all",
            headers={"Authorization": f"Bearer {current_user['token']}"} if "token" in current_user else {},
            timeout=5.0
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to update notifications")
        return resp.json()


# ═══════════════════════════════════════════════════════════════════════════
# MEDIA ASSETS  (MongoDB — FYP Table 137)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/media-assets", response_model=MediaAssetOut, status_code=status.HTTP_201_CREATED)
async def create_media_asset(
    payload: MediaAssetCreate,
    current_user: dict = Depends(get_current_user),
):
    """Register a new media asset (after upload to S3/storage)."""
    doc = {
        "uploader_id": current_user["user_id"],
        "s3_url": payload.s3_url,
        "s3_key": payload.s3_key,
        "file_type": payload.file_type,
        "file_name": payload.file_name,
        "size_bytes": payload.size_bytes,
        "upload_date": datetime.utcnow().isoformat(),
        "entity_type": payload.entity_type,
        "entity_id": payload.entity_id,
        "is_public": payload.is_public,
        "scan_status": "pending",
    }
    result = await media_assets_collection.insert_one(doc)
    return MediaAssetOut(id=str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"})


@router.get("/media-assets", response_model=list[MediaAssetOut])
async def list_media_assets(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """List media assets with optional entity filter."""
    query_filter: dict = {}
    if entity_type:
        query_filter["entity_type"] = entity_type
    if entity_id:
        query_filter["entity_id"] = entity_id

    cursor = media_assets_collection.find(query_filter).sort("upload_date", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(MediaAssetOut(**doc))
    return results


@router.delete("/media-assets/{asset_id}", response_model=MessageResponse)
async def delete_media_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a media asset record."""
    result = await media_assets_collection.delete_one(
        {"_id": ObjectId(asset_id), "uploader_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media asset not found or not owned by you")
    return MessageResponse(message="Media asset deleted")


# ═══════════════════════════════════════════════════════════════════════════
# SYSTEM LOGS  (MongoDB — FYP Table 141)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/system-logs", response_model=SystemLogOut, status_code=status.HTTP_201_CREATED)
async def create_system_log(
    payload: SystemLogCreate,
    current_user: dict = Depends(get_current_user),
):
    """Ingest a structured log entry from any microservice."""
    doc = {
        "service_name": payload.service_name,
        "level": payload.level.upper(),
        "message": payload.message,
        "stack_trace": payload.stack_trace,
        "timestamp": datetime.utcnow().isoformat(),
        "context": payload.context,
        "environment": payload.environment,
    }
    result = await system_logs_collection.insert_one(doc)
    return SystemLogOut(id=str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"})


@router.get("/system-logs", response_model=list[SystemLogOut])
async def list_system_logs(
    service_name: Optional[str] = None,
    level: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    request: Request = None,
    current_user: dict = Depends(require_role("admin")),
):
    """Query system logs with optional filters (admin only)."""
    if request is not None:
        await _enforce_rate_limit(request)

    cache_key = _build_query_cache_key(
        "/ops/system-logs",
        {
            "service_name": service_name,
            "level": level,
            "limit": limit,
            "role": current_user.get("role", ""),
        },
    )
    cached_payload = await _get_cached_query_result(cache_key)
    if cached_payload:
        return [SystemLogOut(**item) for item in cached_payload]

    query_filter: dict = {}
    if service_name:
        query_filter["service_name"] = service_name
    if level:
        query_filter["level"] = level.upper()

    cursor = system_logs_collection.find(query_filter).sort("timestamp", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(SystemLogOut(**doc))

    await _set_cached_query_result(cache_key, [item.model_dump() for item in results])
    return results


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE FLAGS  (Redis — FYP Table 151)
# ═══════════════════════════════════════════════════════════════════════════

@router.put("/feature-flags/{feature_name}")
async def set_feature_flag(
    feature_name: str,
    enabled: bool = True,
    rollout_percentage: int = 100,
    target_roles: list[str] = Query(None),
    current_user: dict = Depends(require_role("admin")),
):
    """Create or update a feature flag (admin only). No expiry — manual invalidation."""
    flag_data = json.dumps({
        "enabled": enabled,
        "rollout_percentage": rollout_percentage,
        "target_roles": target_roles or [],
    })
    await redis_client.set(f"feature:{feature_name}", flag_data)
    return {"feature": feature_name, "enabled": enabled, "rollout_percentage": rollout_percentage}


@router.get("/feature-flags/{feature_name}")
async def get_feature_flag(
    feature_name: str,
    current_user: dict = Depends(get_current_user),
):
    """Check if a feature flag is enabled for the current user."""
    raw = await redis_client.get(f"feature:{feature_name}")
    if not raw:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    flag = json.loads(raw)
    user_role = current_user.get("role", "")
    is_enabled = flag["enabled"]

    # Check role targeting
    if flag.get("target_roles") and user_role not in flag["target_roles"]:
        is_enabled = False

    return {"feature": feature_name, "enabled": is_enabled, "rollout_percentage": flag["rollout_percentage"]}


@router.get("/feature-flags")
async def list_feature_flags(
    current_user: dict = Depends(require_role("admin")),
):
    """List all feature flags (admin only)."""
    flags = []
    async for key in redis_client.scan_iter(match="feature:*"):
        name = key.replace("feature:", "", 1)
        raw = await redis_client.get(key)
        if raw:
            flag = json.loads(raw)
            flags.append({"feature": name, **flag})
    return flags


@router.delete("/feature-flags/{feature_name}")
async def delete_feature_flag(
    feature_name: str,
    current_user: dict = Depends(require_role("admin")),
):
    """Delete a feature flag (admin only)."""
    deleted = await redis_client.delete(f"feature:{feature_name}")
    if not deleted:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    return MessageResponse(message=f"Feature flag '{feature_name}' deleted")


@router.get("/cache/query/{query_hash}")
async def get_cached_query_by_hash(
    query_hash: str,
    current_user: dict = Depends(require_role("admin")),
):
    """Inspect query-cache entries by hash (FYP Table 150 helper endpoint)."""
    key = f"query:{query_hash}"
    raw = await redis_client.get(key)
    if not raw:
        raise HTTPException(status_code=404, detail="Cached query not found")
    try:
        return {"key": key, "value": json.loads(raw)}
    except json.JSONDecodeError:
        return {"key": key, "value": raw}


@router.delete("/cache/query", response_model=MessageResponse)
async def clear_query_cache(
    current_user: dict = Depends(require_role("admin")),
):
    """Clear all cached query entries (query:{hash})."""
    deleted = 0
    async for key in redis_client.scan_iter(match="query:*"):
        deleted += await redis_client.delete(key)
    return MessageResponse(message=f"Cleared {deleted} query-cache key(s)")


@router.get("/cache/ratelimit")
async def inspect_ratelimit_counter(
    ip: str,
    endpoint: str,
    current_user: dict = Depends(require_role("admin")),
):
    """Inspect a current ratelimit:{ip}:{endpoint} value and TTL."""
    key = f"ratelimit:{ip}:{endpoint}"
    value = await redis_client.get(key)
    ttl = await redis_client.ttl(key)
    return {
        "key": key,
        "count": int(value) if value is not None else 0,
        "ttl_seconds": ttl,
    }
