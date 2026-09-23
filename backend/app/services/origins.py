"""Deciding whether a widget request comes from an allowed site.

CORS headers protect browsers, not servers: a script can call the widget
endpoint from anywhere and simply ignore them. So the allowlist is enforced in
the handler — a request from a site that is not on the list is refused with
403 whatever headers it carries — and CORS is layered on top so that the
allowed sites' browsers can read the response.

An empty allowlist means "any site", which is convenient while testing and is
flagged in the dashboard as such.
"""

from __future__ import annotations

from urllib.parse import urlparse


def origin_host(origin: str | None) -> str | None:
    if not origin or origin == "null":
        return None
    parsed = urlparse(origin)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None
    host = parsed.hostname.lower()
    return f"{host}:{parsed.port}" if parsed.port else host


def is_allowed(origin: str | None, allowed: list[str]) -> bool:
    if not allowed:
        return True
    host = origin_host(origin)
    if host is None:
        return False
    bare = host.split(":")[0]
    for entry in allowed:
        if entry.startswith("*."):
            suffix = entry[1:]  # ".example.com"
            if bare.endswith(suffix) or bare == entry[2:]:
                return True
        elif host == entry or bare == entry:
            return True
    return False
