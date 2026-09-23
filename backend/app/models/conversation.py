"""One question and its answer.

Deliberately minimal: the question, the answer, which articles backed it, how
confident retrieval was, and how long it took. No visitor IP, no user agent,
no cookie — a support log does not need to know who asked.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow

if TYPE_CHECKING:
    from app.models.knowledge_base import KnowledgeBase


class ConversationStatus(StrEnum):
    ANSWERED = "answered"
    UNRESOLVED = "unresolved"   # no or weak context — the bot said it did not know
    ERROR = "error"             # the provider failed


class Channel(StrEnum):
    PREVIEW = "preview"   # the dashboard's test chat
    WIDGET = "widget"     # the embedded widget on a customer's site
    API = "api"           # POST /v1/ask with an API key


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_kb_created", "knowledge_base_id", "created_at"),
        Index("ix_conversations_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    knowledge_base_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), index=True
    )

    channel: Mapped[str] = mapped_column(String(16), default=Channel.PREVIEW)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str | None] = mapped_column(Text, default=None)
    # [{"id": 12, "title": "API Authentication", "score": 4.1}] — only articles
    # retrieval actually returned and the answer actually used.
    sources: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(16), default=ConversationStatus.ANSWERED)
    confidence: Mapped[float | None] = mapped_column(Float, default=None)
    provider: Mapped[str] = mapped_column(String(24), default="mock")
    response_ms: Mapped[int | None] = mapped_column(Integer, default=None)
    error: Mapped[str | None] = mapped_column(String(255), default=None)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )

    knowledge_base: Mapped["KnowledgeBase"] = relationship(back_populates="conversations")
