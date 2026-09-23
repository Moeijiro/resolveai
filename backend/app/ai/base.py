"""The provider contract.

Every provider receives the same thing — the question and the passages
retrieval selected — and returns the same thing: an answer, whether the
context was enough to answer at all, and which of the *supplied* articles it
used. The pipeline never trusts a provider's citations blindly; see
``app.services.answering``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from app.retrieval.base import ScoredPassage


class ProviderError(Exception):
    """The provider could not produce an answer (network, quota, bad output)."""


@dataclass(slots=True)
class ProviderAnswer:
    text: str
    answerable: bool
    cited_article_ids: list[int] = field(default_factory=list)


class AIProvider(Protocol):
    name: str

    async def answer(self, question: str, passages: list[ScoredPassage]) -> ProviderAnswer: ...
