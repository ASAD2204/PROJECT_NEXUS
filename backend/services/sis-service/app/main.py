"""
FastAPI application entry point for the SIS (Student Information System) service.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routes import router


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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Routes --------------------------------------------------------------- #
app.include_router(router, prefix="/api/v1")


# ---- Health check --------------------------------------------------------- #
@app.get("/health")
def health_check():
    """Simple liveness probe."""
    return {"status": "ok", "service": "sis-service"}
