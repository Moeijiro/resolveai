"""Building and caching a retriever per knowledge base.

The index is rebuilt only when the knowledge base changes: the cache key is
the number of articles plus the latest ``updated_at``, both one cheap query
away. Editing an article therefore takes effect on the very next question,
without a background job.
"""

from __future__ import annotations

import threading

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Article
from app.retrieval.bm25 import BM25Retriever
from app.retrieval.chunking import split_article

_CACHE: dict[int, tuple[tuple, BM25Retriever]] = {}
_LOCK = threading.Lock()


def _signature(db: Session, knowledge_base_id: int) -> tuple:
    count, latest = db.execute(
        select(func.count(Article.id), func.max(Article.updated_at)).where(
            Article.knowledge_base_id == knowledge_base_id
        )
    ).one()
    return (count, str(latest))


def retriever_for(db: Session, knowledge_base_id: int) -> BM25Retriever:
    signature = _signature(db, knowledge_base_id)
    with _LOCK:
        cached = _CACHE.get(knowledge_base_id)
        if cached and cached[0] == signature:
            return cached[1]

    articles = db.execute(
        select(Article).where(Article.knowledge_base_id == knowledge_base_id)
    ).scalars().all()
    passages = [
        passage
        for article in articles
        for passage in split_article(article.id, article.title, article.category, article.content)
    ]
    retriever = BM25Retriever(passages)
    with _LOCK:
        _CACHE[knowledge_base_id] = (signature, retriever)
    return retriever


def clear_cache() -> None:
    with _LOCK:
        _CACHE.clear()
