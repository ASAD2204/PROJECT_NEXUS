from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine
from app.routes import router

# Create DB tables on startup (development only)
Base.metadata.create_all(bind=engine)


def _ensure_alumni_job_cover_image_column() -> None:
        inspector = inspect(engine)
        try:
            columns = {column["name"] for column in inspector.get_columns("alumni_jobs")}
        except Exception:
            return

        if "cover_image" not in columns:
                with engine.begin() as connection:
                        connection.execute(text("ALTER TABLE alumni_jobs ADD COLUMN cover_image VARCHAR(255)"))


_ensure_alumni_job_cover_image_column()

app = FastAPI(
    title="Project Nexus - Alumni Service",
    description="Manages the alumni directory, networking, and job board.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "alumni-service"}
