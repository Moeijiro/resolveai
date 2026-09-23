"""API keys and the server-side question endpoint, ``POST /v1/ask``."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Path, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.conversations import as_answer
from app.core import rate_limit
from app.core.errors import APIError
from app.core.security import API_KEY_HEADER, generate_api_key, hash_api_key
from app.db.base import utcnow
from app.db.session import get_db
from app.models import APIKey, Channel, KnowledgeBase, User
from app.schemas.api import APIKeyCreate, APIKeyCreated, APIKeyOut, AnswerOut, V1AskRequest
from app.services.answering import answer_question

router = APIRouter(tags=["developer api"])

MAX_KEYS = 10


def _owned_key(db: Session, user: User, key_id: int) -> APIKey:
    key = db.get(APIKey, key_id)
    if key is None or key.user_id != user.id:
        raise APIError("not_found", "API key not found.", 404)
    return key


@router.get("/api/keys", response_model=list[APIKeyOut], summary="List API keys")
def list_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(
        db.execute(
            select(APIKey).where(APIKey.user_id == user.id).order_by(APIKey.created_at.desc())
        ).scalars().all()
    )


@router.post("/api/keys", response_model=APIKeyCreated, status_code=201, summary="Create an API key")
def create_key(
    payload: APIKeyCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> APIKeyCreated:
    active = [key for key in user.api_keys if key.active]
    if len(active) >= MAX_KEYS:
        raise APIError("key_limit_reached", f"You already have {MAX_KEYS} active keys.", 409)
    raw, prefix, digest = generate_api_key()
    key = APIKey(user_id=user.id, name=payload.name, prefix=prefix, hashed_key=digest)
    db.add(key)
    db.commit()
    db.refresh(key)
    # `raw` is not stored anywhere: this response is the only place it exists.
    return APIKeyCreated(
        id=key.id, name=key.name, prefix=key.prefix, enabled=True,
        created_at=key.created_at, last_used_at=None, revoked_at=None, key=raw,
    )


@router.post("/api/keys/{key_id}/revoke", response_model=APIKeyOut, summary="Revoke a key")
def revoke_key(
    key_id: int = Path(ge=1), user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> APIKey:
    key = _owned_key(db, user, key_id)
    key.revoke()
    db.commit()
    db.refresh(key)
    return key


@router.delete("/api/keys/{key_id}", status_code=204, summary="Delete a key")
def delete_key(
    key_id: int = Path(ge=1), user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Response:
    db.delete(_owned_key(db, user, key_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/v1/ask",
    response_model=AnswerOut,
    summary="Ask a knowledge base from your own server",
    responses={401: {"description": "Missing or invalid API key"}},
)
async def ask(
    payload: V1AskRequest,
    x_api_key: str | None = Header(default=None, alias=API_KEY_HEADER),
    db: Session = Depends(get_db),
) -> AnswerOut:
    """Server-to-server: authenticated by an API key, never used in a browser."""
    if not x_api_key:
        raise APIError("missing_api_key", f"Send your key in the {API_KEY_HEADER} header.", 401)
    key = db.execute(
        select(APIKey).where(APIKey.hashed_key == hash_api_key(x_api_key))
    ).scalar_one_or_none()
    if key is None or not key.active:
        raise APIError("invalid_api_key", "The API key is invalid or has been revoked.", 401)

    rate_limit.check(f"v1:{key.id}", times=60)

    kb = db.get(KnowledgeBase, payload.knowledge_base_id)
    if kb is None or kb.user_id != key.user_id:
        raise APIError("not_found", "Knowledge base not found.", 404)
    if kb.status != "active":
        raise APIError("knowledge_base_paused", "This knowledge base is paused.", 409)

    key.last_used_at = utcnow()
    db.commit()
    result = await answer_question(db, kb, payload.question, Channel.API)
    return as_answer(result)
