from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # PostgreSQL en production (Neon/Render). SQLite par défaut pour dev/tests.
    DATABASE_URL: str = "sqlite:///./cdc.db"
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    ALGORITHM: str = "HS256"
    # Origines autorisées pour le frontend (séparées par des virgules)
    CORS_ORIGINS: str = "*"
    SEED_ON_STARTUP: bool = True

    class Config:
        env_file = ".env"

    @property
    def cors_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
