"""OpenAI-compatible provider.

Talks to any server that implements the Chat Completions API — OpenAI itself,
Azure OpenAI, or a local gateway — through ``OPENAI_BASE_URL``. Structured
output (a JSON schema) is requested so the answer, the answerable flag and the
cited article ids come back as data rather than prose to be parsed.
"""

from __future__ import annotations

import json
import logging

import httpx

from app.ai.base import ProviderAnswer, ProviderError
from app.ai.prompt import ANSWER_SCHEMA, SYSTEM_PROMPT, build_user_message
from app.core.config import settings
from app.retrieval.base import ScoredPassage

logger = logging.getLogger("resolveai.ai")

_transport: httpx.AsyncBaseTransport | None = None


def set_transport(transport: httpx.AsyncBaseTransport | None) -> None:
    """Test hook: answer requests without calling a real model."""
    global _transport
    _transport = transport


class OpenAIProvider:
    name = "openai"

    async def answer(self, question: str, passages: list[ScoredPassage]) -> ProviderAnswer:
        body = {
            "model": settings.openai_model,
            "temperature": 0.1,
            "max_tokens": settings.ai_max_output_tokens,
            "response_format": {"type": "json_schema", "json_schema": ANSWER_SCHEMA},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_message(question, passages)},
            ],
        }

        try:
            async with httpx.AsyncClient(
                base_url=settings.openai_base_url,
                timeout=settings.ai_timeout_seconds,
                transport=_transport,
            ) as client:
                response = await client.post(
                    "/chat/completions",
                    json=body,
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                )
        except httpx.HTTPError as exc:
            # The key is in a header, never in the message.
            raise ProviderError(f"AI provider unreachable: {type(exc).__name__}") from exc

        if response.status_code == 429:
            raise ProviderError("AI provider rate limit or quota reached")
        if response.status_code >= 400:
            logger.warning("AI provider returned %s", response.status_code)
            raise ProviderError(f"AI provider returned {response.status_code}")

        try:
            content = response.json()["choices"][0]["message"]["content"]
            data = json.loads(content)
            return ProviderAnswer(
                text=str(data["answer"]).strip(),
                answerable=bool(data["answerable"]),
                cited_article_ids=[int(value) for value in data.get("source_ids", [])],
            )
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ProviderError("AI provider returned an unexpected response") from exc
