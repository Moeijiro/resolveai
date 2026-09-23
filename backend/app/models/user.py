"""Accounts."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.api_key import APIKey
    from app.models.knowledge_base import KnowledgeBase


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(80), default=None)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Marks the account created by `python -m app.seed`.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    knowledge_bases: Mapped[list["KnowledgeBase"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    api_keys: Mapped[list["APIKey"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
