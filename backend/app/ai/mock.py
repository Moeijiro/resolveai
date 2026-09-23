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

SENTENCE_RE = re.compile(r"(?<=[.!?])\s+|\n{2,}")
# A single newline inside a paragraph is a soft wrap, not a sentence break.
SOFT_WRAP_RE = re.compile(r"(?<!\n)\n(?!\n)")
# Answers are shown as plain text (the widget never renders HTML), so the
# Markdown emphasis in the source articles would appear as literal asterisks.
MARKDOWN_RE = re.compile(r"\*\*|__|`")
MAX_SENTENCES = 3


class MockProvider:
    name = "mock"

    async def answer(self, question: str, passages: list[ScoredPassage]) -> ProviderAnswer:
        query_terms = set(tokenize(question))
        # With three or more terms, a supporting sentence must share at least
        # two of them; one shared word is how off-topic lines sneak in.
        min_overlap = 2 if len(query_terms) >= 3 else 1
        candidates: list[tuple[float, int, int, str]] = []
        best_score = passages[0].score if passages else 0.0

        for rank, item in enumerate(passages):
            # Supporting sentences come from passages close to the best one;
            # a passage that merely shares a word does not get quoted.
            if item.score < best_score * 0.6:
                continue
            # A sentence under "## Webhook returning 401" is about that, even
            # if the sentence itself only says "If your endpoint answers 401".
            heading_terms = set(tokenize(item.passage.heading or ""))
            text = SOFT_WRAP_RE.sub(" ", item.passage.text)
            for position, sentence in enumerate(SENTENCE_RE.split(text)):
                sentence = MARKDOWN_RE.sub("", sentence).strip().lstrip("-*0123456789. ").strip()
                if len(sentence) < 20:
                    continue
                own = query_terms & set(tokenize(sentence))
                combined = own | (query_terms & heading_terms)
                if not own or len(combined) < min_overlap:
                    continue
                # Prefer the sentence's own overlap, then its heading, then the
                # better-ranked passage; order within the passage is restored
                # afterwards so steps stay in sequence.
                score = len(own) * 10 + len(combined) * 3 + item.score - rank
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
