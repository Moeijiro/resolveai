"""How a knowledge base's public widget looks and where it may run."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.knowledge_base import KnowledgeBase


class WidgetConfig(Base, TimestampMixin):
    __tablename__ = "widget_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    knowledge_base_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), unique=True
    )

    title: Mapped[str] = mapped_column(String(60), default="Support")
    welcome_message: Mapped[str] = mapped_column(
        String(300), default="Hi! Ask me anything about our product."
    )
    accent_color: Mapped[str] = mapped_column(String(7), default="#2cc6e0")
    position: Mapped[str] = mapped_column(String(16), default="bottom-right")
    # Hostnames the widget may be embedded on. Empty means "any" — convenient
    # while testing, and flagged as such in the dashboard.
    allowed_domains: Mapped[list[str]] = mapped_column(JSON, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    knowledge_base: Mapped["KnowledgeBase"] = relationship(back_populates="widget")
