"""
FastAPI application entry point for the SIS (Student Information System) service.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app.routes import router
from app.config import settings


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Create database tables on startup (if they do not already exist)."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Project Nexus - SIS Service",
    description="Student Information System microservice handling students, "
                "faculty, enrollments, transcripts, departments, programs, "
                "and semesters.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---- CORS ----------------------------------------------------------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Routes --------------------------------------------------------------- #
app.include_router(router, prefix="/api/v1")


# ---- Health check --------------------------------------------------------- #
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Deep health check for database and optional services."""
    health = {"status": "ok", "service": "sis-service", "checks": {}}
    
    # Check PostgreSQL
    try:
        db.execute(text("SELECT 1"))
        health["checks"]["postgres"] = "connected"
    except Exception as exc:
        health["status"] = "error"
        health["checks"]["postgres"] = f"failed: {str(exc)}"
        
    # Check Kafka (Optional check if producer exists)
    # Note: SIS doesn't currently use Kafka in routes, but if it did, we'd check it here.

    if health["status"] == "error":
        return Response(content=str(health), status_code=503)
        
    return health
