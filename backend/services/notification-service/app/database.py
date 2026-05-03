from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis

from app.config import settings

mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
mongo_db = mongo_client.get_default_database()

redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

notifications_collection = mongo_db["notifications"]
announcements_collection = mongo_db["content_announcements"]
