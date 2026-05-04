from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    MONGO_URL: str = "mongodb://mongodb:27017/nexus_ops"
    GEMINI_API_KEY: str = ""
    INTERNAL_API_KEY: str = "change-me-internal-key"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8000"
    GATEWAY_URL: str = "http://api-gateway:80"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
