"""The mock provider: deterministic answers with no network and no API key.

It is extractive rather than generative. From the passages retrieval selected
it picks the sentences that share the most words with the question, stitches
them into a short answer, and cites the articles those sentences came from.
Nothing is invented — every sentence in a mock answer is a sentence from the
knowledge base — which makes it a faithful stand-in for demos and tests, and a
useful baseline to compare a real model against.
"""

from __future__ import annotations

import re

from app.ai.base import ProviderAnswer
from app.retrieval.base import ScoredPassage
from app.retrieval.text import tokenize

SENTENCE_RE = re.compile(r"(?<=[.!?])\s+|\n+")
MAX_SENTENCES = 4
MIN_OVERLAP = 1


class MockProvider:
    name = "mock"

    async def answer(self, question: str, passages: list[ScoredPassage]) -> ProviderAnswer:
        query_terms = set(tokenize(question))
        candidates: list[tuple[float, int, int, str]] = []
        best_score = passages[0].score if passages else 0.0

        for rank, item in enumerate(passages):
            # Supporting sentences come from passages close to the best one;
            # a passage that merely shares a word does not get quoted.
            if item.score < best_score * 0.6:
                continue
            for position, sentence in enumerate(SENTENCE_RE.split(item.passage.text)):
                sentence = sentence.strip().lstrip("-*0123456789. ").strip()
                if len(sentence) < 20:
                    continue
                overlap = len(query_terms & set(tokenize(sentence)))
                if overlap < MIN_OVERLAP:
                    continue
                # Prefer overlap, then the better-ranked passage, then order
                # within the passage so steps stay in sequence.
                score = overlap * 10 + item.score - rank
                candidates.append((score, rank, position, sentence))

        if not candidates:
            return ProviderAnswer(
                text=(
                    "I couldn't find this in the documentation. "
                    "Please contact the support team, who can help directly."
                ),
                answerable=False,
            )

        best = sorted(candidates, key=lambda c: c[0], reverse=True)[:MAX_SENTENCES]
        # Re-order the chosen sentences as they appear in the docs.
        best.sort(key=lambda c: (c[1], c[2]))
        used_ranks = {c[1] for c in best}
        cited = []
        for rank in sorted(used_ranks):
            article_id = passages[rank].passage.article_id
            if article_id not in cited:
                cited.append(article_id)

        sentences = [c[3] if c[3].endswith((".", "!", "?")) else c[3] + "." for c in best]
        text = "Based on the documentation: " + " ".join(sentences)
        return ProviderAnswer(text=text, answerable=True, cited_article_ids=cited)
