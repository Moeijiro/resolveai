"""FastAPI application entry point."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai.factory import get_provider
from app.api.routes import auth, conversations, developer, knowledge, system, widget
from app.core.config import settings
from app.core.errors import install_error_handlers
from app.core.security import API_KEY_HEADER
from app.db.session import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(name)s: %(message)s")
logger = logging.getLogger("resolveai")

DESCRIPTION = """
ResolveAI answers support questions from your own documentation.

* **`/api/*`** — the dashboard's API (session cookie).
* **`/v1/ask`** — ask from your own server with an `X-API-Key`.
* **`/widget/*`** and **`/widget.js`** — the public, rate-limited widget
  surface, identified by a public knowledge-base id.

Answers come from a pluggable provider (`AI_PROVIDER=mock` runs with no API
key) over passages chosen by BM25 retrieval, and cite only articles that were
actually retrieved.
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    logger.info("ResolveAI ready (provider=%s, retrieval=bm25)", get_provider().name)
    yield


app = FastAPI(
    title="ResolveAI API",
    description=DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# The dashboard origin only. The widget endpoints set their own CORS headers
# per knowledge base, after checking that knowledge base's allowlist.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", API_KEY_HEADER],
)

install_error_handlers(app)

for router in (
    system.router, auth.router, knowledge.router, conversations.router,
    developer.router, widget.router,
):
    app.include_router(router)


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "resolveai-api", "docs": "/docs", "widget": "/widget.js"})
