from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"
    KAFKA_BROKER: str = "kafka:9092"
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    CAMPUS_LAT: float = 32.0853
    CAMPUS_LNG: float = 74.1894
    MAX_RADIUS_METERS: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
