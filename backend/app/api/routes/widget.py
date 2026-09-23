"""The public widget surface.

``GET /widget.js`` serves the embeddable script; ``GET /widget/config/{id}``
tells it how to look; ``POST /widget/chat`` answers questions. None of them
take a session or an API key — the public id identifies the knowledge base and
can do nothing but ask — so every request is rate limited per visitor and per
knowledge base, and checked against the widget's allowed domains.
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.deps import get_owned_knowledge_base
from app.core import rate_limit
from app.core.config import settings
from app.core.errors import APIError, error_body
from app.db.session import get_db
from app.models import Channel, KnowledgeBase, User, WidgetConfig
from app.schemas.api import PublicWidgetConfig, WidgetChatRequest, WidgetConfigOut, WidgetConfigUpdate
from app.services.answering import answer_question
from app.services.origins import is_allowed

router = APIRouter(tags=["widget"])

WIDGET_DIR = Path(__file__).resolve().parents[3] / "widget"
MAX_BODY_BYTES = 8 * 1024


def embed_code(public_id: str) -> str:
    return (
        f'<script src="{settings.public_api_url}/widget.js" '
        f'data-project="{public_id}" async></script>'
    )


def _cors(response: Response, origin: str | None) -> Response:
    """Let the (already allowed) origin's browser read the response."""
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    return response


def _widget_for(db: Session, public_id: str) -> tuple[KnowledgeBase, WidgetConfig]:
    kb = db.execute(
        select(KnowledgeBase).where(KnowledgeBase.public_id == public_id)
    ).scalar_one_or_none()
    if kb is None or kb.widget is None or not kb.widget.enabled or kb.status != "active":
        raise APIError("widget_unavailable", "This support widget is not available.", 404)
    return kb, kb.widget


# --- Dashboard: configure the widget ---------------------------------------------
@router.get("/api/knowledge-bases/{kb_id}/widget", response_model=WidgetConfigOut, summary="Widget settings")
def get_widget(kb: KnowledgeBase = Depends(get_owned_knowledge_base), db: Session = Depends(get_db)):
    if kb.widget is None:
        kb.widget = WidgetConfig()
        db.commit()
        db.refresh(kb)
    return WidgetConfigOut(
        **WidgetConfigOut.model_validate(kb.widget).model_dump(exclude={"public_id", "embed_code"}),
        public_id=kb.public_id,
        embed_code=embed_code(kb.public_id),
    )


@router.put("/api/knowledge-bases/{kb_id}/widget", response_model=WidgetConfigOut, summary="Save widget settings")
def update_widget(
    payload: WidgetConfigUpdate,
    kb: KnowledgeBase = Depends(get_owned_knowledge_base),
    db: Session = Depends(get_db),
):
    widget = kb.widget or WidgetConfig(knowledge_base_id=kb.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(widget, field, value)
    kb.widget = widget
    db.commit()
    db.refresh(widget)
    return WidgetConfigOut(
        **WidgetConfigOut.model_validate(widget).model_dump(exclude={"public_id", "embed_code"}),
        public_id=kb.public_id,
        embed_code=embed_code(kb.public_id),
    )


# --- Public: what the embedded script calls ---------------------------------------
@router.get("/widget.js", include_in_schema=False)
def widget_script() -> FileResponse:
    return FileResponse(
        WIDGET_DIR / "resolveai-widget.js",
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/widget/config/{public_id}", response_model=PublicWidgetConfig, summary="Widget appearance")
def widget_config(
    public_id: str,
    request: Request,
    origin: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Response:
    rate_limit.check(f"widget-config:{rate_limit.client_ip(request)}", times=60)
    kb, widget = _widget_for(db, public_id)
    if not is_allowed(origin, widget.allowed_domains):
        raise APIError("origin_not_allowed", "This site is not allowed to use this widget.", 403)
    body = PublicWidgetConfig(
        title=widget.title,
        welcome_message=widget.welcome_message,
        accent_color=widget.accent_color,
        position=widget.position,
    )
    return _cors(JSONResponse(body.model_dump()), origin)


@router.post("/widget/chat", summary="Ask from the embedded widget")
async def widget_chat(
    request: Request,
    origin: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Response:
    """Parsed from the raw body on purpose.

    The widget posts JSON as ``text/plain``, which keeps the request "simple"
    in CORS terms and avoids a preflight round trip on every question. The
    body is still validated against the same schema as everything else.
    """
    raw = await request.body()
    if len(raw) > MAX_BODY_BYTES:
        raise APIError("payload_too_large", "Request is too large.", 413)
    try:
        payload = WidgetChatRequest.model_validate(json.loads(raw or b"{}"))
    except (ValidationError, json.JSONDecodeError):
        return _cors(
            JSONResponse(error_body("validation_error", "Ask a question between 2 and "
                                    f"{settings.max_question_chars} characters."), 422),
            origin,
        )

    kb, widget = _widget_for(db, payload.project)
    if not is_allowed(origin, widget.allowed_domains):
        # Enforced here, not only through CORS: CORS protects browsers, and a
        # script can ignore it.
        raise APIError("origin_not_allowed", "This site is not allowed to use this widget.", 403)

    visitor = rate_limit.client_ip(request)
    rate_limit.check(f"widget:{kb.id}:{visitor}", times=settings.widget_rate_per_minute)
    rate_limit.check(f"widget-kb:{kb.id}", times=settings.widget_rate_per_minute * 20)

    result = await answer_question(db, kb, payload.question, Channel.WIDGET)
    return _cors(
        JSONResponse(
            {
                "answer": result.answer,
                "sources": result.sources,
                "status": str(result.status),
            }
        ),
        origin,
    )


@router.get("/demo-site", include_in_schema=False, response_class=HTMLResponse)
def demo_site(user_hint: str | None = None) -> HTMLResponse:
    """A pretend customer website with the widget embedded — for demos."""
    return HTMLResponse((WIDGET_DIR / "demo.html").read_text(encoding="utf-8"))
