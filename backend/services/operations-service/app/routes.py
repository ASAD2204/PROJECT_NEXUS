import json
import hashlib
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db, mongo_db, redis_client
from app.dependencies import get_current_user, require_role
from app.models import OpsGrievance, OpsGrievanceComment, SisStudent
from app.nlp_router import route_grievance
from app.schemas import (
    AnnouncementCreate,
    AnnouncementOut,
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
        SisStudent.user_id == current_user["user_id"]
    ).first()
    student_id = student.student_id if student else None

    # Auto-route using NLP
    routing = route_grievance(payload.description)

    grievance = OpsGrievance(
        student_id=student_id,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        assigned_department=routing["department"],
        is_urgent=routing["is_urgent"],
        priority="High" if routing["is_urgent"] else "Normal",
    )
    db.add(grievance)
    db.commit()
    db.refresh(grievance)
    return grievance


@router.get("/grievances/me", response_model=list[GrievanceOut])
def my_grievances(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return current user's grievances."""
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

    return grievances


@router.get("/grievances", response_model=list[GrievanceOut])
def list_grievances(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hod")),
):
    query = db.query(OpsGrievance)
    if status_filter:
        query = query.filter(OpsGrievance.status == status_filter)
    return query.order_by(OpsGrievance.created_at.desc()).all()


@router.put("/grievances/{ticket_id}/status", response_model=GrievanceOut)
def update_grievance_status(
    ticket_id: int,
    payload: GrievanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hod")),
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
    current_user: dict = Depends(require_role("admin", "faculty")),
):
    now = datetime.utcnow().isoformat()
    doc = {
        "title": payload.title,
        "content": payload.content,
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
    }
    result = await announcements_collection.insert_one(doc)
    await _invalidate_query_cache()
    return AnnouncementOut(
        id=str(result.inserted_id),
        title=doc["title"],
        content=doc["content"],
        author_id=doc["author_id"],
        target_audience=doc["target_audience"],
        target_programs=doc["target_programs"],
        target_semesters=doc["target_semesters"],
        priority=doc["priority"],
        published_at=doc["published_at"],
        expires_at=doc["expires_at"],
        is_pinned=doc["is_pinned"],
        attachments=doc["attachments"],
        view_count=doc["view_count"],
    )


@router.get("/announcements", response_model=list[AnnouncementOut])
async def list_announcements(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    await _enforce_rate_limit(request)
    role = current_user["role"]
    cache_key = _build_query_cache_key(
        "/ops/announcements",
        {"role": role},
    )
    cached_payload = await _get_cached_query_result(cache_key)
    if cached_payload:
        return [AnnouncementOut(**item) for item in cached_payload]

    query_filter = {"target_audience": {"$in": [role, "all"]}}
    cursor = announcements_collection.find(query_filter).sort(
        [("is_pinned", -1), ("published_at", -1)]
    )
    results = []
    async for doc in cursor:
        results.append(AnnouncementOut(
            id=str(doc["_id"]),
            title=doc["title"],
            content=doc["content"],
            author_id=doc.get("author_id", doc.get("created_by", "")),
            target_audience=doc["target_audience"],
            target_programs=doc.get("target_programs"),
            target_semesters=doc.get("target_semesters"),
            priority=doc.get("priority", "medium"),
            published_at=doc.get("published_at", doc.get("created_at", "")),
            expires_at=doc.get("expires_at"),
            is_pinned=doc.get("is_pinned", False),
            attachments=doc.get("attachments", []),
            view_count=doc.get("view_count", 0),
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
    # Increment view_count
    await announcements_collection.update_one(
        {"_id": ObjectId(announcement_id)}, {"$inc": {"view_count": 1}}
    )
    response = AnnouncementOut(
        id=str(doc["_id"]),
        title=doc["title"],
        content=doc["content"],
        author_id=doc.get("author_id", doc.get("created_by", "")),
        target_audience=doc["target_audience"],
        target_programs=doc.get("target_programs"),
        target_semesters=doc.get("target_semesters"),
        priority=doc.get("priority", "medium"),
        published_at=doc.get("published_at", doc.get("created_at", "")),
        expires_at=doc.get("expires_at"),
        is_pinned=doc.get("is_pinned", False),
        attachments=doc.get("attachments", []),
        view_count=doc.get("view_count", 0) + 1,
    )
    await _set_cached_query_result(cache_key, response.model_dump())
    return response


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


# ── Grievance Comments ────────────────────────────────────────────────────

@router.get("/grievances/{ticket_id}/comments", response_model=list[GrievanceCommentOut])
def list_grievance_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List comments on a grievance."""
    return (
        db.query(OpsGrievanceComment)
        .filter(OpsGrievanceComment.ticket_id == ticket_id)
        .order_by(OpsGrievanceComment.created_at.asc())
        .all()
    )


@router.post(
    "/grievances/{ticket_id}/comments",
    response_model=GrievanceCommentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_grievance_comment(
    ticket_id: int,
    payload: GrievanceCommentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add a comment to a grievance."""
    grievance = db.query(OpsGrievance).filter(OpsGrievance.ticket_id == ticket_id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    comment = OpsGrievanceComment(
        ticket_id=ticket_id,
        user_id=current_user["user_id"],
        comment=payload.comment,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


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
    """List audit trail entries with optional filters."""
    query_filter: dict = {}
    if user_id:
        query_filter["user_id"] = user_id
    if action:
        query_filter["action"] = action
    if target_entity:
        query_filter["target_entity"] = target_entity

    cursor = audit_trails_collection.find(query_filter).sort("timestamp", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
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
    """Create a notification for a specific user."""
    await _enforce_rate_limit(request)
    doc = {
        "user_id": payload.user_id,
        "title": payload.title,
        "message": payload.message,
        "type": payload.type,
        "priority": payload.priority,
        "is_read": False,
        "read_at": None,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": payload.expires_at,
        "action_url": payload.action_url,
        "metadata": payload.metadata,
    }
    result = await notifications_collection.insert_one(doc)
    notif_id = str(result.inserted_id)

    # Push to Redis notification queue (FYP Table 148 — 7-day TTL)
    try:
        queue_key = f"notifications:{payload.user_id}"
        await redis_client.lpush(queue_key, f"notif:{notif_id}")
        await redis_client.expire(queue_key, 604800)  # 7 days
    except Exception:
        pass  # fire-and-forget

    return NotificationOut(id=notif_id, **{k: v for k, v in doc.items() if k != "_id"})


@router.get("/notifications/me", response_model=list[NotificationOut])
async def my_notifications(
    is_read: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's notifications."""
    query_filter: dict = {"user_id": current_user["user_id"]}
    if is_read is not None:
        query_filter["is_read"] = is_read

    cursor = notifications_collection.find(query_filter).sort("created_at", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(NotificationOut(**doc))
    return results


@router.put("/notifications/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a single notification as read."""
    result = await notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["user_id"]},
        {"$set": {"is_read": True, "read_at": datetime.utcnow().isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return MessageResponse(message="Notification marked as read")


@router.put("/notifications/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
):
    """Mark all unread notifications as read for the current user."""
    await notifications_collection.update_many(
        {"user_id": current_user["user_id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.utcnow().isoformat()}},
    )
    return MessageResponse(message="All notifications marked as read")


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
    target_roles: list[str] = None,
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
