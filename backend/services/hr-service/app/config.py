from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8000"
    INTERNAL_API_KEY: str = "change-me-internal-key"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    AES_SECRET_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
