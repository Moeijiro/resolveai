"""The retrieval contract.

The answering pipeline depends on this interface, not on BM25. Swapping in
embeddings later — or a hybrid of both — means adding a class that returns the
same ``RetrievalResult``; nothing downstream changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from app.retrieval.chunking import Passage


@dataclass(slots=True)
class ScoredPassage:
    passage: Passage
    score: float


@dataclass(slots=True)
class RetrievalResult:
    passages: list[ScoredPassage] = field(default_factory=list)
    # Share of the question's distinct terms found in the best passage, 0..1.
    # A high BM25 score can come from a single common word; coverage is what
    # tells "about the same thing" apart from "happens to share a word".
    coverage: float = 0.0
    query_terms: list[str] = field(default_factory=list)

    @property
    def top_score(self) -> float:
        return self.passages[0].score if self.passages else 0.0

    def article_ids(self) -> list[int]:
        seen: list[int] = []
        for item in self.passages:
            if item.passage.article_id not in seen:
                seen.append(item.passage.article_id)
        return seen


class Retriever(Protocol):
    name: str

    def search(self, query: str, top_k: int) -> RetrievalResult: ...
