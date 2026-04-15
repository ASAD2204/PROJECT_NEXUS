from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes import router

# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Library Service - Project Nexus",
    description="Books catalog, issuance, returns, fines, and QR code generation for the Project Nexus university management system.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "library-service"}
