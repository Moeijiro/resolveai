"""Test fixtures. The mock provider is the default, so nothing reaches a network."""

from __future__ import annotations

import os
import tempfile
from collections.abc import Callable, Iterator

import pytest

TEST_DB = os.path.join(tempfile.mkdtemp(prefix="resolveai-tests-"), "test.db")
os.environ.update(
    ENVIRONMENT="development",
    DATABASE_URL=f"sqlite:///{TEST_DB}",
    SECRET_KEY="test-secret-not-used-anywhere-else-0123456789",
    AI_PROVIDER="mock",
    ALLOW_REGISTRATION="true",
    WIDGET_RATE_PER_MINUTE="5",
)

from fastapi.testclient import TestClient  # noqa: E402

from app.core.rate_limit import reset_rate_limits  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.retrieval.index import clear_cache  # noqa: E402

PASSWORD = "correct-horse-battery"

ARTICLES = [
    (
        "API Keys",
        "Developers",
        "# API Keys\n\n## Create an API key\nGo to Settings, open API keys and click Create key. "
        "The full key is shown only once, so copy it into your secret manager.\n\n"
        "## Revoke a key\nRevoked keys stop working immediately.",
    ),
    (
        "Authentication",
        "Account",
        "# Authentication\n\n## Reset your password\nTo reset your password, open the sign-in page "
        "and click Forgot password. The reset link is valid for one hour.",
    ),
    (
        "Webhooks",
        "Developers",
        "# Webhooks\n\n## Verify signatures\nEvery webhook request includes a signature header. "
        "Compute an HMAC of the raw body with your signing secret and compare it.",
    ),
]


@pytest.fixture(autouse=True)
def fresh_state() -> Iterator[None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    reset_rate_limits()
    clear_cache()
    yield


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app, base_url="http://localhost:8000") as test_client:
        yield test_client


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    response = client.post("/api/auth/register", json={"email": "dev@example.com", "password": PASSWORD})
    assert response.status_code == 201, response.text
    return client


@pytest.fixture
def knowledge_base(auth_client: TestClient) -> dict:
    """A knowledge base with three small, distinct articles."""
    kb = auth_client.post("/api/knowledge-bases", json={"name": "Product docs"}).json()
    for title, category, content in ARTICLES:
        created = auth_client.post(
            f"/api/knowledge-bases/{kb['id']}/articles",
            json={"title": title, "category": category, "content": content},
        )
        assert created.status_code == 201, created.text
    return auth_client.get(f"/api/knowledge-bases/{kb['id']}").json()


@pytest.fixture
def switch_user(auth_client: TestClient) -> Callable[[], None]:
    def _switch() -> None:
        auth_client.post("/api/auth/logout")
        auth_client.cookies.clear()
        auth_client.post("/api/auth/register", json={"email": "other@example.com", "password": PASSWORD})

    return _switch
