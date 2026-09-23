"""Chooses the provider from ``AI_PROVIDER``. Adding one is a module and a line here."""

from __future__ import annotations

from functools import lru_cache

from app.ai.base import AIProvider
from app.ai.mock import MockProvider
from app.ai.openai_provider import OpenAIProvider
from app.core.config import settings

PROVIDERS: dict[str, type] = {"mock": MockProvider, "openai": OpenAIProvider}


@lru_cache
def get_provider() -> AIProvider:
    return PROVIDERS[settings.ai_provider]()
