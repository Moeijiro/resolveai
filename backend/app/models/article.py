"""A documentation article — the unit the retriever searches."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow

if TYPE_CHECKING:
    from app.models.knowledge_base import KnowledgeBase


class Article(Base, TimestampMixin):
    __tablename__ = "articles"
    __table_args__ = (Index("ix_articles_kb_updated", "knowledge_base_id", "updated_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    knowledge_base_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), index=True
    )

    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(60), default=None, index=True)
    # How the article arrived: typed in the dashboard or uploaded as a file.
    source: Mapped[str] = mapped_column(String(16), default="manual")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    knowledge_base: Mapped["KnowledgeBase"] = relationship(back_populates="articles")
