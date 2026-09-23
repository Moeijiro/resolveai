"""Dashboard analytics, computed from stored conversations.

Nothing is estimated; an empty workspace shows zeros.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Article, Conversation, ConversationStatus, KnowledgeBase

SERIES_DAYS = 14


def _day(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d")


def overview(db: Session, user_id: int) -> dict[str, Any]:
    kb_ids = list(
        db.execute(select(KnowledgeBase.id).where(KnowledgeBase.user_id == user_id)).scalars().all()
    )
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    series_start = start_of_day - timedelta(days=SERIES_DAYS - 1)

    articles = db.execute(
        select(func.count()).select_from(Article).where(Article.knowledge_base_id.in_(kb_ids))
    ).scalar_one() if kb_ids else 0

    def count(*conditions) -> int:
        if not kb_ids:
            return 0
        return db.execute(
            select(func.count())
            .select_from(Conversation)
            .where(Conversation.knowledge_base_id.in_(kb_ids), *conditions)
        ).scalar_one()

    recent_rows = db.execute(
        select(Conversation.created_at, Conversation.status, Conversation.sources)
        .where(Conversation.knowledge_base_id.in_(kb_ids), Conversation.created_at >= series_start)
    ).all() if kb_ids else []

    per_day: dict[str, dict[str, int]] = {}
    article_use: Counter[tuple[int, str]] = Counter()
    for created_at, status, sources in recent_rows:
        bucket = per_day.setdefault(_day(created_at), {"answered": 0, "unresolved": 0, "error": 0})
        bucket[status] = bucket.get(status, 0) + 1
        for source in sources or []:
            article_use[(source["id"], source["title"])] += 1

    series = []
    for offset in range(SERIES_DAYS):
        day = (series_start + timedelta(days=offset)).strftime("%Y-%m-%d")
        values = per_day.get(day, {"answered": 0, "unresolved": 0, "error": 0})
        series.append({"day": day, **values})

    total = count()
    answered = count(Conversation.status == ConversationStatus.ANSWERED.value)
    avg_ms = db.execute(
        select(func.avg(Conversation.response_ms)).where(Conversation.knowledge_base_id.in_(kb_ids))
    ).scalar_one() if kb_ids else None

    return {
        "knowledge_bases": len(kb_ids),
        "articles": articles,
        "questions_total": total,
        "questions_today": count(Conversation.created_at >= start_of_day),
        "answered": answered,
        "unresolved": count(Conversation.status == ConversationStatus.UNRESOLVED.value),
        "errors": count(Conversation.status == ConversationStatus.ERROR.value),
        "answer_rate": round(answered / total * 100, 1) if total else None,
        "avg_response_ms": int(avg_ms) if avg_ms is not None else None,
        "series": series,
        "top_articles": [
            {"id": aid, "title": title, "uses": uses}
            for (aid, title), uses in article_use.most_common(5)
        ],
    }
