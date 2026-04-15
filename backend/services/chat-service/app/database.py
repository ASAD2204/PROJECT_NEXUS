from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from app.config import settings

# ---------------------------------------------------------------------------
# MongoDB (async via Motor)
# ---------------------------------------------------------------------------
mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
mongo_db = mongo_client.get_default_database()

# ---------------------------------------------------------------------------
# Redis (async)
# ---------------------------------------------------------------------------
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

# ---------------------------------------------------------------------------
# Collection references
# ---------------------------------------------------------------------------
chat_sessions = mongo_db["chat_sessions"]
chat_messages = mongo_db["chat_messages"]
