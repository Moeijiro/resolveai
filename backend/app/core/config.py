"""Application configuration, read from the environment or a local .env file."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )

    # --- Runtime ---------------------------------------------------------
    environment: Literal["development", "production"] = "development"
    app_url: str = "http://localhost:3000"
    public_api_url: str = "http://localhost:8000"

    # --- Database --------------------------------------------------------
    database_url: str = "sqlite:///./resolveai.db"

    # --- Security --------------------------------------------------------
    secret_key: str = Field(
        default="dev-only-insecure-secret-replace-before-deploying", min_length=8
    )
    access_token_ttl_minutes: int = Field(default=720, ge=5)
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    allow_registration: bool = True

    # --- AI provider -------------------------------------------------------
    ai_provider: Literal["mock", "openai"] = "mock"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    ai_timeout_seconds: float = Field(default=30.0, gt=0, le=120)
    ai_max_output_tokens: int = Field(default=500, ge=50, le=4000)

    # --- Retrieval ---------------------------------------------------------
    retrieval_top_k: int = Field(default=4, ge=1, le=10)
    retrieval_min_score: float = Field(default=1.2, ge=0)

    # --- Limits --------------------------------------------------------------
    max_question_chars: int = Field(default=500, ge=20, le=4000)
    max_article_chars: int = Field(default=50_000, ge=1000, le=500_000)
    widget_rate_per_minute: int = Field(default=20, ge=1, le=1000)

    @field_validator("app_url", "public_api_url", "openai_base_url")
    @classmethod
    def _strip_slash(cls, value: str) -> str:
        return value.rstrip("/")

    @model_validator(mode="after")
    def _guard(self) -> "Settings":
        if self.ai_provider == "openai" and not self.openai_api_key:
            raise ValueError("AI_PROVIDER=openai requires OPENAI_API_KEY")
        if self.environment == "production":
            if "insecure" in self.secret_key or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be a strong value in production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
        return self

    @property
    def debug_errors(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
