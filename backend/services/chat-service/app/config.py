from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URL: str = "mongodb://mongodb:27017/nexus_chat"
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
