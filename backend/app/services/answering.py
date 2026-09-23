"""The answer pipeline.

    question → retrieve passages → confident enough? → provider → verify
    citations → store the conversation → answer + sources

Two decisions carry most of the product's honesty:

* **A weak retrieval never reaches the model.** The best passage must score
  at least ``RETRIEVAL_MIN_SCORE`` *and* contain at least
  ``RETRIEVAL_MIN_COVERAGE`` of the question's distinct terms. Score alone is
  not enough: "Do you support single sign-on with Okta?" scores well against
  a paragraph about *signing in*, on the strength of one word. Below either
  bar the question is marked *unresolved* and the visitor is told plainly that
  the documentation does not cover it. Sending a model loosely related context
  is how assistants end up confidently wrong — and it costs money to be wrong.
* **Citations are verified, not trusted.** A source is shown only if it was
  both retrieved *and* named by the provider. A model cannot cite an article
  that was not in its context, however plausible the id.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.base import ProviderError
from app.ai.factory import get_provider
from app.core.config import settings
from app.models import Article, Channel, Conversation, ConversationStatus, KnowledgeBase
from app.retrieval.index import retriever_for

logger = logging.getLogger("resolveai.answering")

NOT_FOUND_MESSAGE = (
    "I couldn't find an answer to that in the documentation. "
    "Please contact the support team — they'll be able to help."
)
ERROR_MESSAGE = (
    "Sorry — I can't answer right now. Please try again in a moment, "
    "or contact the support team."
)


@dataclass(slots=True)
class AnswerResult:
    answer: str
    sources: list[dict[str, Any]] = field(default_factory=list)
    status: str = ConversationStatus.ANSWERED
    confidence: float = 0.0
    response_ms: int = 0
    conversation_id: int | None = None
    provider: str = "mock"


def normalise_question(question: str) -> str:
    return " ".join(question.split())[: settings.max_question_chars]


async def answer_question(
    db: Session, knowledge_base: KnowledgeBase, question: str, channel: Channel
) -> AnswerResult:
    started = time.perf_counter()
    provider = get_provider()
    question = normalise_question(question)

    retrieval = retriever_for(db, knowledge_base.id).search(question, settings.retrieval_top_k)
    result = AnswerResult(
        answer=NOT_FOUND_MESSAGE,
        status=ConversationStatus.UNRESOLVED,
        confidence=retrieval.coverage,
        provider=provider.name,
    )

    confident = (
        bool(retrieval.passages)
        and retrieval.top_score >= settings.retrieval_min_score
        and retrieval.coverage >= settings.retrieval_min_coverage
    )
    if confident:
        try:
            reply = await provider.answer(question, retrieval.passages)
        except ProviderError as exc:
            logger.warning("Provider %s failed: %s", provider.name, exc)
            result.answer = ERROR_MESSAGE
            result.status = ConversationStatus.ERROR
            error = str(exc)[:255]
        else:
            error = None
            retrieved = retrieval.article_ids()
            # Only articles that were both retrieved and cited count.
            cited = [aid for aid in reply.cited_article_ids if aid in retrieved]
            if reply.answerable and reply.text:
                result.answer = reply.text
                result.status = ConversationStatus.ANSWERED
                result.sources = _describe(db, cited, retrieval)
            else:
                result.answer = reply.text or NOT_FOUND_MESSAGE
    else:
        error = None

    result.response_ms = int((time.perf_counter() - started) * 1000)

    conversation = Conversation(
        knowledge_base_id=knowledge_base.id,
        channel=str(channel),
        question=question,
        answer=result.answer,
        sources=result.sources,
        status=str(result.status),
        confidence=round(result.confidence, 3),
        provider=provider.name,
        response_ms=result.response_ms,
        error=error,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    result.conversation_id = conversation.id
    return result


def _describe(db: Session, article_ids: list[int], retrieval) -> list[dict[str, Any]]:  # noqa: ANN001
    if not article_ids:
        return []
    titles = dict(
        db.execute(select(Article.id, Article.title).where(Article.id.in_(article_ids))).all()
    )
    best: dict[int, float] = {}
    for item in retrieval.passages:
        aid = item.passage.article_id
        best[aid] = max(best.get(aid, 0.0), item.score)
    return [
        {"id": aid, "title": titles[aid], "score": round(best.get(aid, 0.0), 2)}
        for aid in article_ids
        if aid in titles
    ]
