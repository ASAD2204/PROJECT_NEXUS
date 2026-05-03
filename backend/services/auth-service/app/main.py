from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import Base, engine, get_db
from app.config import settings

# Create DB tables on startup (development only)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Auth Service - Project Nexus",
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


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    from sqlalchemy import text
    health = {"status": "ok", "service": "auth-service", "checks": {}}
    
    # Check Database
    try:
        db.execute(text("SELECT 1"))
        health["checks"]["database"] = "connected"
    except Exception as exc:
        print(f"Health Check Database Failure: {exc}")
        health["status"] = "error"
        health["checks"]["database"] = f"failed: {str(exc)}"
        
    # Check Redis
    try:
        from app.dependencies import redis_client
        redis_client.ping()
        health["checks"]["redis"] = "connected"
    except Exception as exc:
        print(f"Health Check Redis Failure: {exc}")
        health["status"] = "error"
        health["checks"]["redis"] = f"failed: {str(exc)}"
        
    if health["status"] == "error":
        import json
        from fastapi import Response
        return Response(content=json.dumps(health), media_type="application/json", status_code=503)
        
    return health
