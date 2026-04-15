from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.routes import router
from app.database import Base, engine, analytics_events

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Analytics Service - Project Nexus",
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


@app.on_event("startup")
async def create_mongo_indexes():
    """Create MongoDB indexes for analytics_events (FYP Table 139)."""
    try:
        await analytics_events.create_index("event_type")
        await analytics_events.create_index("user_id")
        await analytics_events.create_index("timestamp")
        await analytics_events.create_index(
            [("event_type", 1), ("timestamp", 1)], name="event_type_timestamp"
        )
        logger.info("MongoDB indexes created for analytics-service")
    except Exception as exc:
        logger.error("Failed to create MongoDB indexes: %s", exc)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "analytics-service"}
