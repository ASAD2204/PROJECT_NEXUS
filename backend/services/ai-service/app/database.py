from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis

from app.config import settings

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------
mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
mongo_db = mongo_client.get_default_database()

# ---------------------------------------------------------------------------
# Redis
# ---------------------------------------------------------------------------
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------
chat_messages = mongo_db["ai_chat_messages"]
chat_sessions = mongo_db["ai_chat_sessions"]
