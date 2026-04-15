"""
AI Service configuration — supports multi-key rotation.

API Keys are comma-separated in environment variables:
  GEMINI_API_KEYS=key1,key2,key3,...,key10
  GROQ_API_KEYS=key1,key2,key3,...
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # -- Multi-key pools (comma-separated) --
    GEMINI_API_KEYS: str = ""         # 10 free Gemini API keys
    GROQ_API_KEYS: str = ""           # multiple Groq API keys

    # -- Legacy single key (backward compatible) --
    GEMINI_API_KEY: str = ""

    # -- ChromaDB --
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000

    # -- Redis --
    REDIS_URL: str = "redis://redis:6379"

    # -- MongoDB --
    MONGO_URL: str = "mongodb://mongodb:27017/nexus_chat"

    # -- PostgreSQL (for DB query engine) --
    DATABASE_URL: str = ""

    # -- Kafka --
    KAFKA_BROKER: str = "kafka:9092"

    # -- JWT --
    JWT_SECRET: str = "changeme"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    # -- CAG settings --
    CAG_SIMILARITY_THRESHOLD: float = 0.90
    CAG_TTL_SECONDS: int = 86400  # 24 hours

    class Config:
        env_file = ".env"

    @property
    def all_gemini_keys(self) -> str:
        """Merge GEMINI_API_KEYS with legacy GEMINI_API_KEY."""
        keys = self.GEMINI_API_KEYS
        if self.GEMINI_API_KEY:
            if keys:
                keys = f"{keys},{self.GEMINI_API_KEY}"
            else:
                keys = self.GEMINI_API_KEY
        return keys


settings = Settings()
