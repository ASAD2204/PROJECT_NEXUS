from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.routes import router
from app.database import Base, engine, mongo_db

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Operations Service - Project Nexus",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Startup — create MongoDB indexes (FYP spec)
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def create_mongo_indexes():
    try:
        ann = mongo_db["content_announcements"]
        await ann.create_index("author_id")
        await ann.create_index("course_id")
        await ann.create_index("published_at")
        await ann.create_index("expires_at")
        await ann.create_index("is_pinned")
        await ann.create_index("target_audience")
        await ann.create_index("likes_count")
        await ann.create_index("comments_count")
        await ann.create_index([
            ("target_audience", 1),
            ("is_pinned", -1),
            ("published_at", -1),
        ], name="audience_pin_published")

        audit = mongo_db["audit_trails"]
        await audit.create_index("user_id")
        await audit.create_index("action")
        await audit.create_index("timestamp")
        await audit.create_index([("user_id", 1), ("timestamp", 1)], name="user_timestamp")
        await audit.create_index(
            [("target_entity", 1), ("entity_id", 1)], name="entity_compound"
        )

        media = mongo_db["media_assets"]
        await media.create_index("uploader_id")
        await media.create_index("s3_key", unique=True)
        await media.create_index(
            [("entity_type", 1), ("entity_id", 1)], name="entity_type_id"
        )

        notif = mongo_db["notifications"]
        await notif.create_index("user_id")
        await notif.create_index("is_read")
        await notif.create_index("created_at")
        await notif.create_index(
            [("user_id", 1), ("is_read", 1), ("created_at", 1)],
            name="user_read_created",
        )
        await notif.create_index(
            "expires_at", expireAfterSeconds=0, name="ttl_expires_at"
        )

        logs = mongo_db["system_logs"]
        await logs.create_index("service_name")
        await logs.create_index("level")
        await logs.create_index(
            "timestamp", expireAfterSeconds=30 * 24 * 3600, name="ttl_30d"
        )
        await logs.create_index(
            [("service_name", 1), ("level", 1), ("timestamp", 1)],
            name="service_level_ts",
        )

        logger.info("MongoDB indexes created for operations-service")
    except Exception as exc:
        logger.error("Failed to create MongoDB indexes: %s", exc)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "operations-service"}
