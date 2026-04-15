from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

# ---------------------------------------------------------------------------
# PostgreSQL (SQLAlchemy)
# ---------------------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# MongoDB (Motor async)
# ---------------------------------------------------------------------------
mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
mongo_db = mongo_client.get_default_database()

# Collection references
analytics_events = mongo_db["analytics_events"]
