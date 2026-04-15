from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    MONGO_URL: str = "mongodb://mongodb:27017/nexus_lms"
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
