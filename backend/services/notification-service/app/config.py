from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URL: str = "mongodb://mongodb:27017/nexus_notify"
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    INTERNAL_API_KEY: str = "change-me-internal-key"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
