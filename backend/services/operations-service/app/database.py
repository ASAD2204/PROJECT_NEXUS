from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
mongo_db = mongo_client.get_default_database()

# ---------------------------------------------------------------------------
# Redis (async) — notification queue (FYP Table 148) + feature flags (Table 151)
# ---------------------------------------------------------------------------
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
