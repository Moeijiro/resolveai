"""Server-side API keys for POST /v1/ask. Only a digest is stored."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow

if TYPE_CHECKING:
    from app.models.user import User


class APIKey(Base, TimestampMixin):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(64))
    prefix: Mapped[str] = mapped_column(String(24), index=True)
    hashed_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped["User"] = relationship(back_populates="api_keys")

    @property
    def active(self) -> bool:
        return self.enabled and self.revoked_at is None

    def revoke(self) -> None:
        self.enabled = False
        self.revoked_at = utcnow()
