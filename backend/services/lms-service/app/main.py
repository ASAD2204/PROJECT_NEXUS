from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.routes import router
from app.database import Base, engine, feedback_surveys, get_db

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

from fastapi import Depends
from sqlalchemy.orm import Session
from app.config import settings

app = FastAPI(
    title="LMS Service - Project Nexus",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.on_event("startup")
async def create_mongo_indexes():
    """Create MongoDB indexes for feedback_surveys (FYP Table 142)."""
    try:
        await feedback_surveys.create_index("survey_type")
        await feedback_surveys.create_index("course_id")
        await feedback_surveys.create_index("faculty_id")
        await feedback_surveys.create_index("student_id")
        await feedback_surveys.create_index("submitted_at")
        await feedback_surveys.create_index(
            [("faculty_id", 1), ("semester_id", 1)], name="faculty_semester"
        )
        logger.info("MongoDB indexes created for lms-service")
    except Exception as exc:
        logger.error("Failed to create MongoDB indexes: %s", exc)


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    health = {"status": "ok", "service": "lms-service", "checks": {}}
    
    # Check PostgreSQL
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        health["checks"]["postgres"] = "connected"
    except Exception as exc:
        logger.error("Health Check Failed: Postgres - %s", exc)
        health["status"] = "error"
        health["checks"]["postgres"] = f"failed: {str(exc)}"
        
    # Check MongoDB
    try:
        from app.database import mongo_db
        await mongo_db.command("ping")
        health["checks"]["mongodb"] = "connected"
    except Exception as exc:
        logger.error("Health Check Failed: MongoDB - %s", exc)
        health["status"] = "error"
        health["checks"]["mongodb"] = f"failed: {str(exc)}"

    # Check Redis
    try:
        import redis
        r = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=2)
        r.ping()
        health["checks"]["redis"] = "connected"
    except Exception as exc:
        logger.error("Health Check Failed: Redis - %s", exc)
        health["status"] = "error"
        health["checks"]["redis"] = f"failed: {str(exc)}"

    # Check Kafka (Lazy)
    try:
        from app.kafka_producer import _get_producer
        if _get_producer() is not None:
            health["checks"]["kafka"] = "connected"
        else:
            health["status"] = "warning"
            health["checks"]["kafka"] = "unavailable"
    except Exception as exc:
        logger.error("Health Check Warning: Kafka - %s", exc)
        health["status"] = "warning"
        health["checks"]["kafka"] = f"failed: {str(exc)}"
        
    if health["status"] == "error":
        from fastapi import Response
        import json
        return Response(content=json.dumps(health), status_code=503, media_type="application/json")
        
    return health
