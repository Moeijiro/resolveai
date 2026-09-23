"""BM25 keyword retrieval over article passages.

Chosen over embeddings on purpose. It needs no API key, no vector store and no
background indexing; it is deterministic, so the test suite can assert on it;
and its scores are explainable — a passage ranks because it contains the words
the visitor used. For a knowledge base of a few hundred articles written in
the same vocabulary as the questions, that is a strong baseline, and the
``Retriever`` interface leaves room for embeddings when paraphrase matters.

Titles and headings are counted twice: a question that names the topic of an
article should find that article first.
"""

from __future__ import annotations

import math
from collections import Counter

from app.retrieval.base import RetrievalResult, ScoredPassage
from app.retrieval.chunking import Passage
from app.retrieval.text import tokenize

K1 = 1.4
B = 0.75
TITLE_WEIGHT = 2
# Passages scoring below this share of the best one are dropped: they are the
# long tail that matched a single word, and sending them to a model invites it
# to use them.
RELATIVE_CUTOFF = 0.4


class BM25Retriever:
    name = "bm25"

    def __init__(self, passages: list[Passage]) -> None:
        self.passages = passages
        self.documents: list[Counter[str]] = []
        self.lengths: list[int] = []

        for passage in passages:
            tokens = tokenize(passage.text)
            boosted = tokenize(passage.article_title) + tokenize(passage.heading or "")
            tokens += boosted * TITLE_WEIGHT
            self.documents.append(Counter(tokens))
            self.lengths.append(len(tokens))

        self.count = len(passages)
        self.average_length = (sum(self.lengths) / self.count) if self.count else 0.0

        document_frequency: Counter[str] = Counter()
        for document in self.documents:
            document_frequency.update(document.keys())
        # BM25+ style IDF, floored at a small positive value so common terms
        # still count a little instead of going negative.
        self.idf = {
            term: max(0.05, math.log((self.count - freq + 0.5) / (freq + 0.5) + 1))
            for term, freq in document_frequency.items()
        }

    def search(self, query: str, top_k: int = 4) -> RetrievalResult:
        terms = tokenize(query)
        if not terms or not self.count:
            return RetrievalResult()

        scored: list[ScoredPassage] = []
        for index, document in enumerate(self.documents):
            score = 0.0
            length_norm = 1 - B + B * (self.lengths[index] / (self.average_length or 1))
            for term in terms:
                frequency = document.get(term)
                if not frequency:
                    continue
                score += self.idf[term] * (frequency * (K1 + 1)) / (frequency + K1 * length_norm)
            if score > 0:
                scored.append(ScoredPassage(self.passages[index], round(score, 3)))

        scored.sort(key=lambda item: item.score, reverse=True)
        if not scored:
            return RetrievalResult(query_terms=sorted(set(terms)))

        best = scored[0].score
        kept = [item for item in scored if item.score >= best * RELATIVE_CUTOFF][:top_k]

        distinct = set(terms)
        best_index = self.passages.index(kept[0].passage)
        covered = {term for term in distinct if term in self.documents[best_index]}
        return RetrievalResult(
            passages=kept,
            coverage=round(len(covered) / len(distinct), 3),
            query_terms=sorted(distinct),
        )
