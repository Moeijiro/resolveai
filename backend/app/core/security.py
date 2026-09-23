"""Passwords, sessions, API keys and widget identifiers."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import settings

SESSION_COOKIE_NAME = "resolveai_session"
API_KEY_HEADER = "X-API-Key"
API_KEY_PREFIX = "rsv_live"
JWT_ALGORITHM = "HS256"

# 128 * r * N = 16 MiB per hash. maxmem must be passed explicitly: OpenSSL's
# default ceiling is 32 MiB and silently rejects anything above it.
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_MAXMEM = 256 * 1024 * 1024


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P,
        dklen=32, maxmem=SCRYPT_MAXMEM,
    )
    return "scrypt${}${}${}${}${}".format(
        SCRYPT_N, SCRYPT_R, SCRYPT_P,
        base64.b64encode(salt).decode(), base64.b64encode(digest).decode(),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_b64, digest_b64 = stored.split("$")
        if scheme != "scrypt":
            return False
        expected = base64.b64decode(digest_b64)
        digest = hashlib.scrypt(
            password.encode(), salt=base64.b64decode(salt_b64),
            n=int(n), r=int(r), p=int(p), dklen=len(expected), maxmem=SCRYPT_MAXMEM,
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, expected)


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=settings.access_token_ttl_minutes)).timestamp()),
            "jti": secrets.token_urlsafe(8),
        },
        settings.secret_key,
        algorithm=JWT_ALGORITHM,
    )


def read_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def generate_api_key() -> tuple[str, str, str]:
    """``(raw, prefix, digest)``.

    A plain SHA-256 is right for a 256-bit random key: there is nothing to
    brute force, and a slow KDF would tax every API call. Passwords are the
    opposite case — see ``hash_password``.
    """
    secret = secrets.token_urlsafe(32)
    raw = f"{API_KEY_PREFIX}_{secret}"
    return raw, f"{API_KEY_PREFIX}_{secret[:6]}", hash_api_key(raw)


def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode()).hexdigest()


def generate_public_id() -> str:
    """The widget's identifier. Public by design — it is not a secret."""
    return f"kb_{secrets.token_urlsafe(12)}"
