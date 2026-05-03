import json
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import announcements_collection, notifications_collection, redis_client
from app.dependencies import get_current_user, require_internal_api_key, require_role
from app.schemas import (
    AnnouncementCreate,
    AnnouncementOut,
    MessageResponse,
    NotificationCreate,
    NotificationOut,
)

router = APIRouter(prefix="/notify", tags=["Notifications"])


@router.post("/notifications", response_model=NotificationOut, status_code=201)
async def create_notification(
    payload: NotificationCreate,
    current_user: dict = Depends(require_role("admin", "faculty")),
):
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

    # Pub/Sub for real-time push listeners.
    await redis_client.publish(
        f"notify:{payload.user_id}",
        json.dumps({"id": notif_id, **doc}, default=str),
    )

    return NotificationOut(id=notif_id, **doc)


@router.post("/internal/notifications", response_model=NotificationOut, status_code=201)
async def create_internal_notification(
    payload: NotificationCreate,
    _: str = Depends(require_internal_api_key),
):
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
    await redis_client.publish(
        f"notify:{payload.user_id}",
        json.dumps({"id": notif_id, **doc}, default=str),
    )
    return NotificationOut(id=notif_id, **doc)


@router.post("/internal/notifications/bulk", response_model=MessageResponse, status_code=201)
async def create_internal_notifications_bulk(
    payloads: list[NotificationCreate],
    _: str = Depends(require_internal_api_key),
):
    docs = []
    now = datetime.utcnow().isoformat()
    for p in payloads:
        docs.append({
            "user_id": p.user_id,
            "title": p.title,
            "message": p.message,
            "type": p.type,
            "priority": p.priority,
            "is_read": False,
            "read_at": None,
            "created_at": now,
            "expires_at": p.expires_at,
            "action_url": p.action_url,
            "metadata": p.metadata,
        })
    
    if docs:
        result = await notifications_collection.insert_many(docs)
        # We don't publish 10,000 messages to Redis here to avoid flooding.
        # Real-time sync for bulk could be handled differently (e.g. a single 'refresh' signal).
        await redis_client.publish("notify:broadcast", json.dumps({"event": "bulk_notifications", "count": len(docs)}))
    
    return MessageResponse(message=f"Created {len(docs)} notifications")


@router.get("/notifications/me", response_model=list[NotificationOut])
async def my_notifications(
    is_read: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
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
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification id")

    result = await notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["user_id"]},
        {"$set": {"is_read": True, "read_at": datetime.utcnow().isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return MessageResponse(message="Notification marked as read")


@router.put("/notifications/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await notifications_collection.update_many(
        {"user_id": current_user["user_id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.utcnow().isoformat()}},
    )
    return MessageResponse(message="All notifications marked as read")


@router.post("/announcements/global", response_model=AnnouncementOut, status_code=201)
async def create_global_announcement(
    payload: AnnouncementCreate,
    current_user: dict = Depends(require_role("admin")),
):
    doc = {
        "title": payload.title,
        "content": payload.content,
        "author_id": current_user["user_id"],
        "target_audience": payload.target_audience,
        "priority": payload.priority,
        "published_at": datetime.utcnow().isoformat(),
    }
    result = await announcements_collection.insert_one(doc)

    # Broadcast marker for all connected websocket listeners.
    await redis_client.publish(
        "notify:broadcast",
        json.dumps({"event": "global_announcement", **doc}, default=str),
    )

    return AnnouncementOut(id=str(result.inserted_id), **doc)
