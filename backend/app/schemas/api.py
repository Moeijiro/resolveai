"""Request and response models."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.config import settings
from app.schemas.common import utc_iso

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$")
COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
DOMAIN_RE = re.compile(r"^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$")


class _Timestamps(BaseModel):
    @field_serializer("created_at", "updated_at", check_fields=False)
    def _as_utc(self, value: datetime | None) -> str | None:
        return utc_iso(value)


# --- Auth ---------------------------------------------------------------------
class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(max_length=320)
    password: str = Field(min_length=10, max_length=128)
    name: str | None = Field(default=None, max_length=80)

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_RE.match(value):
            raise ValueError("must be a valid email address")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(max_length=320)
    password: str = Field(max_length=128)


class UserOut(_Timestamps):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None
    is_demo: bool
    created_at: datetime


# --- Knowledge bases and articles ---------------------------------------------
class KnowledgeBaseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)


class KnowledgeBaseUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    status: Literal["active", "paused"] | None = None


class KnowledgeBaseOut(_Timestamps):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    status: str
    public_id: str
    created_at: datetime
    updated_at: datetime
    article_count: int = 0
    categories: list[str] = []
    last_article_update: datetime | None = None
    questions: int = 0
    unresolved: int = 0

    @field_serializer("last_article_update")
    def _last(self, value: datetime | None) -> str | None:
        return utc_iso(value)


class ArticleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    category: str | None = Field(default=None, max_length=60)

    @field_validator("content")
    @classmethod
    def _length(cls, value: str) -> str:
        if len(value) > settings.max_article_chars:
            raise ValueError(f"must be at most {settings.max_article_chars} characters")
        return value


class ArticleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    category: str | None = Field(default=None, max_length=60)

    @field_validator("content")
    @classmethod
    def _length(cls, value: str | None) -> str | None:
        if value is not None and len(value) > settings.max_article_chars:
            raise ValueError(f"must be at most {settings.max_article_chars} characters")
        return value


class ArticleOut(_Timestamps):
    model_config = ConfigDict(from_attributes=True)

    id: int
    knowledge_base_id: int
    title: str
    content: str
    category: str | None
    source: str
    created_at: datetime
    updated_at: datetime


class ArticleSummary(_Timestamps):
    """List view: no full content, just enough to scan."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    knowledge_base_id: int
    title: str
    category: str | None
    source: str
    excerpt: str
    created_at: datetime
    updated_at: datetime


# --- Questions ------------------------------------------------------------------
class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    knowledge_base_id: int = Field(ge=1)
    question: str = Field(min_length=2)

    @field_validator("question")
    @classmethod
    def _length(cls, value: str) -> str:
        value = value.strip()
        if len(value) > settings.max_question_chars:
            raise ValueError(f"must be at most {settings.max_question_chars} characters")
        if len(value) < 2:
            raise ValueError("is too short")
        return value


class WidgetChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project: str = Field(min_length=4, max_length=40)
    question: str = Field(min_length=2)

    @field_validator("question")
    @classmethod
    def _length(cls, value: str) -> str:
        value = value.strip()
        if len(value) > settings.max_question_chars:
            raise ValueError(f"must be at most {settings.max_question_chars} characters")
        if len(value) < 2:
            raise ValueError("is too short")
        return value


class Source(BaseModel):
    id: int
    title: str
    score: float | None = None


class AnswerOut(BaseModel):
    answer: str
    sources: list[Source]
    status: str
    confidence: float
    response_ms: int
    conversation_id: int | None
    provider: str


class ConversationOut(_Timestamps):
    model_config = ConfigDict(from_attributes=True)

    id: int
    knowledge_base_id: int
    channel: str
    question: str
    answer: str | None
    sources: list[dict[str, Any]]
    status: str
    confidence: float | None
    provider: str
    response_ms: int | None
    error: str | None
    created_at: datetime
    knowledge_base_name: str | None = None


class ConversationPage(BaseModel):
    items: list[ConversationOut]
    total: int
    limit: int
    offset: int


# --- Widget -------------------------------------------------------------------------
class WidgetConfigUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=60)
    welcome_message: str | None = Field(default=None, min_length=1, max_length=300)
    accent_color: str | None = None
    position: Literal["bottom-right", "bottom-left"] | None = None
    allowed_domains: list[str] | None = Field(default=None, max_length=20)
    enabled: bool | None = None

    @field_validator("accent_color")
    @classmethod
    def _color(cls, value: str | None) -> str | None:
        if value is not None and not COLOR_RE.match(value):
            raise ValueError("must be a hex colour like #2cc6e0")
        return value

    @field_validator("allowed_domains")
    @classmethod
    def _domains(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = []
        for entry in value:
            domain = entry.strip().lower().removeprefix("https://").removeprefix("http://").rstrip("/")
            if not domain:
                continue
            if not DOMAIN_RE.match(domain):
                raise ValueError(f"'{entry}' is not a hostname (e.g. example.com or *.example.com)")
            cleaned.append(domain)
        return sorted(set(cleaned))


class WidgetConfigOut(_Timestamps):
    model_config = ConfigDict(from_attributes=True)

    title: str
    welcome_message: str
    accent_color: str
    position: str
    allowed_domains: list[str]
    enabled: bool
    public_id: str = ""
    embed_code: str = ""


class PublicWidgetConfig(BaseModel):
    """What the embedded script may know: presentation only."""

    title: str
    welcome_message: str
    accent_color: str
    position: str


# --- API keys ---------------------------------------------------------------------
class APIKeyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=64)


class APIKeyOut(_Timestamps):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    prefix: str
    enabled: bool
    created_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None

    @field_serializer("last_used_at", "revoked_at")
    def _utc(self, value: datetime | None) -> str | None:
        return utc_iso(value)


class APIKeyCreated(APIKeyOut):
    key: str
    warning: str = "Copy this key now — only a hash is stored, so it cannot be shown again."


class V1AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    knowledge_base_id: int = Field(ge=1)
    question: str = Field(min_length=2)

    @field_validator("question")
    @classmethod
    def _length(cls, value: str) -> str:
        value = value.strip()
        if len(value) > settings.max_question_chars:
            raise ValueError(f"must be at most {settings.max_question_chars} characters")
        return value
