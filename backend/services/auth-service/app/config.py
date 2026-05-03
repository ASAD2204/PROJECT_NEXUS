from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    ALLOW_ORIGINS: list[str] = ["*"]
    JWT_SESSION_CHECK: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
