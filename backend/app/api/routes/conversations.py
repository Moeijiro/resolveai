"""The preview chat, conversation history, unresolved questions and analytics."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_knowledge_base
from app.core.errors import APIError
from app.core.rate_limit import RateLimiter
from app.db.session import get_db
from app.models import Channel, Conversation, ConversationStatus, KnowledgeBase, User
from app.schemas.api import AnswerOut, ChatRequest, ConversationOut, ConversationPage
from app.services import analytics
from app.services.answering import answer_question

router = APIRouter(prefix="/api", tags=["conversations"])
chat_limit = RateLimiter(times=30, seconds=60, scope="preview-chat")


def as_answer(result) -> AnswerOut:  # noqa: ANN001
    return AnswerOut(
        answer=result.answer,
        sources=result.sources,
        status=str(result.status),
        confidence=round(result.confidence, 3),
        response_ms=result.response_ms,
        conversation_id=result.conversation_id,
        provider=result.provider,
    )


@router.post("/chat", response_model=AnswerOut, summary="Ask a question (dashboard preview)")
async def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(chat_limit),
) -> AnswerOut:
    kb = owned_knowledge_base(db, user, payload.knowledge_base_id)
    result = await answer_question(db, kb, payload.question, Channel.PREVIEW)
    return as_answer(result)


def _page(db: Session, user: User, limit: int, offset: int, *conditions) -> ConversationPage:
    base = (
        select(Conversation, KnowledgeBase.name)
        .join(KnowledgeBase, KnowledgeBase.id == Conversation.knowledge_base_id)
        .where(KnowledgeBase.user_id == user.id, *conditions)
    )
    rows = db.execute(
        base.order_by(Conversation.created_at.desc()).offset(offset).limit(limit)
    ).all()
    total = db.execute(
        select(func.count())
        .select_from(Conversation)
        .join(KnowledgeBase, KnowledgeBase.id == Conversation.knowledge_base_id)
        .where(KnowledgeBase.user_id == user.id, *conditions)
    ).scalar_one()
    return ConversationPage(
        items=[
            ConversationOut(
                **ConversationOut.model_validate(conversation).model_dump(exclude={"knowledge_base_name"}),
                knowledge_base_name=name,
            )
            for conversation, name in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/conversations", response_model=ConversationPage, summary="Conversation history")
def conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status_filter: str | None = Query(default=None, alias="status", max_length=16),
    knowledge_base_id: int | None = Query(default=None, ge=1),
    channel: str | None = Query(default=None, max_length=16),
) -> ConversationPage:
    conditions = []
    if status_filter:
        conditions.append(Conversation.status == status_filter)
    if knowledge_base_id:
        conditions.append(Conversation.knowledge_base_id == knowledge_base_id)
    if channel:
        conditions.append(Conversation.channel == channel)
    return _page(db, user, limit, offset, *conditions)


@router.get("/unresolved", response_model=ConversationPage, summary="Questions the docs could not answer")
def unresolved(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ConversationPage:
    """The product's to-do list: every one of these is a missing article."""
    return _page(
        db, user, limit, offset, Conversation.status == ConversationStatus.UNRESOLVED.value
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationOut, summary="One conversation")
def conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationOut:
    row = db.execute(
        select(Conversation, KnowledgeBase.name)
        .join(KnowledgeBase, KnowledgeBase.id == Conversation.knowledge_base_id)
        .where(Conversation.id == conversation_id, KnowledgeBase.user_id == user.id)
    ).first()
    if row is None:
        raise APIError("not_found", "Conversation not found.", 404)
    conversation, name = row
    return ConversationOut(
        **ConversationOut.model_validate(conversation).model_dump(exclude={"knowledge_base_name"}),
        knowledge_base_name=name,
    )


@router.get("/overview", summary="Dashboard analytics")
def overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return analytics.overview(db, user.id)
