"""Splitting articles into passages.

Whole articles make poor retrieval units: a 3,000-word troubleshooting guide
would match nearly everything, and sending all of it to a model wastes the
context window. Articles are split on Markdown headings and blank lines, and
small paragraphs are merged back up to a target size so a passage is a
coherent answer rather than a single line.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

TARGET_CHARS = 700
MAX_CHARS = 1200
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")


@dataclass(slots=True)
class Passage:
    article_id: int
    article_title: str
    category: str | None
    heading: str | None
    text: str
    position: int


def split_article(article_id: int, title: str, category: str | None, content: str) -> list[Passage]:
    blocks: list[tuple[str | None, str]] = []
    heading: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        text = "\n".join(buffer).strip()
        if text:
            blocks.append((heading, text))
        buffer.clear()

    for line in content.splitlines():
        match = HEADING_RE.match(line.strip())
        if match:
            flush()
            heading = match.group(2).strip()
            continue
        if not line.strip():
            flush()
            continue
        buffer.append(line.rstrip())
    flush()

    # Merge small blocks under the same heading up to the target size.
    passages: list[Passage] = []
    current_heading: str | None = None
    current: list[str] = []

    def emit() -> None:
        text = "\n\n".join(current).strip()
        if text:
            for piece in _hard_wrap(text):
                passages.append(
                    Passage(article_id, title, category, current_heading, piece, len(passages))
                )
        current.clear()

    for block_heading, text in blocks:
        size = sum(len(part) for part in current)
        if current and (block_heading != current_heading or size + len(text) > TARGET_CHARS):
            emit()
        current_heading = block_heading
        current.append(text)
    emit()

    if not passages and content.strip():
        passages.append(Passage(article_id, title, category, None, content.strip()[:MAX_CHARS], 0))
    return passages


def _hard_wrap(text: str) -> list[str]:
    """A single enormous paragraph is split on sentence boundaries."""
    if len(text) <= MAX_CHARS:
        return [text]
    pieces: list[str] = []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunk = ""
    for sentence in sentences:
        if len(chunk) + len(sentence) > MAX_CHARS and chunk:
            pieces.append(chunk.strip())
            chunk = ""
        chunk += sentence + " "
    if chunk.strip():
        pieces.append(chunk.strip())
    return pieces
