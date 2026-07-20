"""Application configuration.

Settings are read from environment variables (optionally a local ``.env`` file)
with production-safe defaults. Using ``pydantic-settings`` keeps configuration
typed and validated in one place, which is the enterprise pattern for 12-factor
style apps.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    APP_NAME: str = "ExperimentOS"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # --- Database ---
    # SQLite by default for a zero-config developer experience. The exact same
    # SQLAlchemy models run on PostgreSQL by pointing DATABASE_URL at Postgres.
    DATABASE_URL: str = "sqlite:///./experimentos.db"

    # --- Auth ---
    SECRET_KEY: str = "change-me-in-production-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Optional LLM narrative ---
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-5"

    # --- Simulation defaults ---
    DEFAULT_SIMULATION_USERS: int = Field(default=100_000, ge=1_000)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    """Cached accessor so settings are parsed exactly once per process."""
    return Settings()


settings = get_settings()
