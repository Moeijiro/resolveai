from __future__ import annotations

from datetime import datetime, timezone


def utc_iso(value: datetime | None) -> str | None:
    """SQLite returns naive UTC datetimes; say they are UTC so browsers agree."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()
