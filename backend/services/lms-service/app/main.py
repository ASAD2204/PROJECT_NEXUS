from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.routes import router
from app.database import Base, engine, feedback_surveys

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LMS Service - Project Nexus",
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
def health_check():
    return {"status": "ok", "service": "lms-service"}
