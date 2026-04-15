from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import redis

from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------------------------------------------------------
# Redis (sync) — grade cache, CGPA leaderboard, query cache
# ---------------------------------------------------------------------------
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
