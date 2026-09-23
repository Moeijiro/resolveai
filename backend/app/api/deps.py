"""Authentication and ownership."""

from __future__ import annotations

from fastapi import Depends, Path, Request, status
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.security import SESSION_COOKIE_NAME, read_access_token
from app.db.session import get_db
from app.models import Article, KnowledgeBase, User

UNAUTHENTICATED = APIError("unauthenticated", "Sign in to continue.", status.HTTP_401_UNAUTHORIZED)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise UNAUTHENTICATED
    payload = read_access_token(token)
    if not payload:
        raise UNAUTHENTICATED
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise UNAUTHENTICATED
    return user


def owned_knowledge_base(db: Session, user: User, kb_id: int) -> KnowledgeBase:
    """A knowledge base the caller owns, or 404 — never a hint that it exists."""
    kb = db.get(KnowledgeBase, kb_id)
    if kb is None or kb.user_id != user.id:
        raise APIError("not_found", "Knowledge base not found.", 404)
    return kb


def get_owned_knowledge_base(
    kb_id: int = Path(ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KnowledgeBase:
    return owned_knowledge_base(db, user, kb_id)


def get_owned_article(
    article_id: int = Path(ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Article:
    article = db.get(Article, article_id)
    if article is None or article.knowledge_base.user_id != user.id:
        raise APIError("not_found", "Article not found.", 404)
    return article
