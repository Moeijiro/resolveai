"""Knowledge bases and their articles."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_article, get_owned_knowledge_base
from app.core.config import settings
from app.core.errors import APIError
from app.core.security import generate_public_id
from app.db.base import utcnow
from app.db.session import get_db
from app.models import Article, Conversation, ConversationStatus, KnowledgeBase, User, WidgetConfig
from app.schemas.api import (
    ArticleCreate,
    ArticleOut,
    ArticleSummary,
    ArticleUpdate,
    KnowledgeBaseCreate,
    KnowledgeBaseOut,
    KnowledgeBaseUpdate,
)

router = APIRouter(prefix="/api", tags=["knowledge"])

MAX_KNOWLEDGE_BASES = 20
MAX_UPLOAD_BYTES = 512 * 1024
UPLOAD_TYPES = {".md", ".markdown", ".txt"}


def kb_out(db: Session, kb: KnowledgeBase) -> KnowledgeBaseOut:
    count, latest = db.execute(
        select(func.count(Article.id), func.max(Article.updated_at)).where(
            Article.knowledge_base_id == kb.id
        )
    ).one()
    categories = sorted(
        {
            category
            for category in db.execute(
                select(Article.category).where(Article.knowledge_base_id == kb.id)
            ).scalars().all()
            if category
        }
    )
    questions = db.execute(
        select(func.count()).select_from(Conversation).where(Conversation.knowledge_base_id == kb.id)
    ).scalar_one()
    unresolved = db.execute(
        select(func.count()).select_from(Conversation).where(
            Conversation.knowledge_base_id == kb.id,
            Conversation.status == ConversationStatus.UNRESOLVED.value,
        )
    ).scalar_one()
    return KnowledgeBaseOut(
        **KnowledgeBaseOut.model_validate(kb).model_dump(
            exclude={"article_count", "categories", "last_article_update", "questions", "unresolved"}
        ),
        article_count=count or 0,
        categories=categories,
        last_article_update=latest,
        questions=questions,
        unresolved=unresolved,
    )


def summary(article: Article) -> ArticleSummary:
    text = " ".join(line.lstrip("#-* ") for line in article.content.splitlines() if line.strip())
    return ArticleSummary(
        id=article.id,
        knowledge_base_id=article.knowledge_base_id,
        title=article.title,
        category=article.category,
        source=article.source,
        excerpt=text[:180] + ("…" if len(text) > 180 else ""),
        created_at=article.created_at,
        updated_at=article.updated_at,
    )


def _touch(kb: KnowledgeBase) -> None:
    kb.updated_at = utcnow()


# --- Knowledge bases ------------------------------------------------------------
@router.get("/knowledge-bases", response_model=list[KnowledgeBaseOut], summary="List")
def list_knowledge_bases(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    kbs = db.execute(
        select(KnowledgeBase).where(KnowledgeBase.user_id == user.id).order_by(KnowledgeBase.created_at)
    ).scalars().all()
    return [kb_out(db, kb) for kb in kbs]


@router.post("/knowledge-bases", response_model=KnowledgeBaseOut, status_code=201, summary="Create")
def create_knowledge_base(
    payload: KnowledgeBaseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KnowledgeBaseOut:
    total = db.execute(
        select(func.count()).select_from(KnowledgeBase).where(KnowledgeBase.user_id == user.id)
    ).scalar_one()
    if total >= MAX_KNOWLEDGE_BASES:
        raise APIError("limit_reached", f"Limited to {MAX_KNOWLEDGE_BASES} knowledge bases.", 409)

    kb = KnowledgeBase(
        user_id=user.id,
        name=payload.name,
        description=payload.description,
        public_id=generate_public_id(),
    )
    kb.widget = WidgetConfig(title=f"{payload.name} support")
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb_out(db, kb)


@router.get("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseOut, summary="Detail")
def get_knowledge_base(
    kb: KnowledgeBase = Depends(get_owned_knowledge_base), db: Session = Depends(get_db)
) -> KnowledgeBaseOut:
    return kb_out(db, kb)


@router.patch("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseOut, summary="Update")
def update_knowledge_base(
    payload: KnowledgeBaseUpdate,
    kb: KnowledgeBase = Depends(get_owned_knowledge_base),
    db: Session = Depends(get_db),
) -> KnowledgeBaseOut:
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(kb, field, value)
    db.commit()
    db.refresh(kb)
    return kb_out(db, kb)


@router.delete("/knowledge-bases/{kb_id}", status_code=204, summary="Delete")
def delete_knowledge_base(
    kb: KnowledgeBase = Depends(get_owned_knowledge_base), db: Session = Depends(get_db)
) -> Response:
    db.delete(kb)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Articles --------------------------------------------------------------------
@router.get(
    "/knowledge-bases/{kb_id}/articles",
    response_model=list[ArticleSummary],
    summary="Articles in a knowledge base",
)
def list_articles(
    kb: KnowledgeBase = Depends(get_owned_knowledge_base),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=60),
) -> list[ArticleSummary]:
    stmt = select(Article).where(Article.knowledge_base_id == kb.id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Article.title.ilike(like), Article.content.ilike(like)))
    if category:
        stmt = stmt.where(Article.category == category)
    return [summary(article) for article in db.execute(stmt.order_by(Article.title)).scalars().all()]


@router.get("/articles", response_model=list[ArticleSummary], summary="All articles, searchable")
def search_all_articles(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, max_length=100),
) -> list[ArticleSummary]:
    stmt = (
        select(Article)
        .join(KnowledgeBase, KnowledgeBase.id == Article.knowledge_base_id)
        .where(KnowledgeBase.user_id == user.id)
    )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Article.title.ilike(like), Article.content.ilike(like)))
    return [summary(a) for a in db.execute(stmt.order_by(Article.updated_at.desc())).scalars().all()]


@router.post(
    "/knowledge-bases/{kb_id}/articles",
    response_model=ArticleOut,
    status_code=201,
    summary="Add an article",
)
def create_article(
    payload: ArticleCreate,
    kb: KnowledgeBase = Depends(get_owned_knowledge_base),
    db: Session = Depends(get_db),
) -> Article:
    article = Article(
        knowledge_base_id=kb.id,
        title=payload.title.strip(),
        content=payload.content,
        category=(payload.category or "").strip() or None,
    )
    db.add(article)
    _touch(kb)
    db.commit()
    db.refresh(article)
    return article


@router.post(
    "/knowledge-bases/{kb_id}/upload",
    response_model=ArticleOut,
    status_code=201,
    summary="Upload a .md or .txt file as an article",
)
async def upload_article(
    kb: KnowledgeBase = Depends(get_owned_knowledge_base),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    category: str | None = Query(default=None, max_length=60),
) -> Article:
    name = (file.filename or "document.txt").strip()
    suffix = name[name.rfind("."):].lower() if "." in name else ""
    if suffix not in UPLOAD_TYPES:
        raise APIError("unsupported_file", "Upload a .md or .txt file.", 422)

    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise APIError("payload_too_large", "Files are limited to 512 KB.", 413)
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise APIError("unsupported_file", "The file must be UTF-8 text.", 422) from exc
    if not content.strip():
        raise APIError("empty_file", "The file is empty.", 422)
    content = content[: settings.max_article_chars]

    # A Markdown file's first heading makes a better title than its filename.
    title = name.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").strip().title()
    for line in content.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()[:200]
            break

    article = Article(
        knowledge_base_id=kb.id,
        title=title or "Untitled",
        content=content,
        category=(category or "").strip() or None,
        source="upload",
    )
    db.add(article)
    _touch(kb)
    db.commit()
    db.refresh(article)
    return article


@router.get("/articles/{article_id}", response_model=ArticleOut, summary="Article")
def get_article(article: Article = Depends(get_owned_article)) -> Article:
    return article


@router.patch("/articles/{article_id}", response_model=ArticleOut, summary="Edit an article")
def update_article(
    payload: ArticleUpdate,
    article: Article = Depends(get_owned_article),
    db: Session = Depends(get_db),
) -> Article:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise APIError("nothing_to_update", "No fields to update.", 400)
    for field, value in changes.items():
        if field == "category":
            article.category = (value or "").strip() or None
        elif value is not None:
            setattr(article, field, value)
    article.updated_at = utcnow()
    _touch(article.knowledge_base)
    db.commit()
    db.refresh(article)
    return article


@router.delete("/articles/{article_id}", status_code=204, summary="Delete an article")
def delete_article(article: Article = Depends(get_owned_article), db: Session = Depends(get_db)) -> Response:
    _touch(article.knowledge_base)
    db.delete(article)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
