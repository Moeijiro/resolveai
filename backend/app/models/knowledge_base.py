"""A knowledge base: a named collection of articles with its own widget."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.conversation import Conversation
    from app.models.user import User
    from app.models.widget_config import WidgetConfig


class KnowledgeBase(Base, TimestampMixin):
    __tablename__ = "knowledge_bases"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    # "active" answers questions; "paused" makes the widget and API refuse.
    status: Mapped[str] = mapped_column(String(16), default="active")

    # The identifier the public widget uses. It is safe to put in page source:
    # it can ask questions and nothing else, and every use is rate limited.
    public_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user: Mapped["User"] = relationship(back_populates="knowledge_bases")
    articles: Mapped[list["Article"]] = relationship(
        back_populates="knowledge_base", cascade="all, delete-orphan"
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="knowledge_base", cascade="all, delete-orphan"
    )
    widget: Mapped["WidgetConfig | None"] = relationship(
        back_populates="knowledge_base", cascade="all, delete-orphan", uselist=False
    )
