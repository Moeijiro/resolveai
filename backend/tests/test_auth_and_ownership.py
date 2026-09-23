"""Authentication and the ownership boundary."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.conftest import PASSWORD

PROTECTED = ["/api/me", "/api/knowledge-bases", "/api/conversations", "/api/unresolved", "/api/keys", "/api/overview"]


@pytest.mark.parametrize("path", PROTECTED)
def test_management_routes_require_a_session(client: TestClient, path: str) -> None:
    response = client.get(path)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthenticated"


def test_register_login_logout(client: TestClient) -> None:
    created = client.post("/api/auth/register", json={"email": " Dev@Example.com ", "password": PASSWORD})
    assert created.status_code == 201
    assert created.json()["email"] == "dev@example.com"
    assert "HttpOnly" in created.headers["set-cookie"]

    wrong = client.post("/api/auth/login", json={"email": "dev@example.com", "password": "wrong-password"})
    unknown = client.post("/api/auth/login", json={"email": "who@example.com", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()

    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.clear()
    assert client.get("/api/me").status_code == 401


def test_articles_belong_to_their_owner(auth_client: TestClient, knowledge_base, switch_user) -> None:
    article_id = auth_client.get(f"/api/knowledge-bases/{knowledge_base['id']}/articles").json()[0]["id"]
    switch_user()

    # 404, not 403: the API does not confirm that the ids exist.
    assert auth_client.get(f"/api/knowledge-bases/{knowledge_base['id']}").status_code == 404
    assert auth_client.get(f"/api/articles/{article_id}").status_code == 404
    assert auth_client.patch(f"/api/articles/{article_id}", json={"title": "x"}).status_code == 404
    assert auth_client.delete(f"/api/articles/{article_id}").status_code == 404
    assert auth_client.post(
        f"/api/knowledge-bases/{knowledge_base['id']}/articles",
        json={"title": "Injected", "content": "nope"},
    ).status_code == 404
    assert auth_client.post(
        "/api/chat", json={"knowledge_base_id": knowledge_base["id"], "question": "How do I reset my password?"}
    ).status_code == 404


def test_article_crud_and_search(auth_client: TestClient, knowledge_base) -> None:
    kb_id = knowledge_base["id"]
    assert knowledge_base["article_count"] == 3

    found = auth_client.get(f"/api/knowledge-bases/{kb_id}/articles", params={"q": "password"}).json()
    assert [article["title"] for article in found] == ["Authentication"]

    article_id = found[0]["id"]
    updated = auth_client.patch(f"/api/articles/{article_id}", json={"category": "Security"}).json()
    assert updated["category"] == "Security"

    assert auth_client.delete(f"/api/articles/{article_id}").status_code == 204
    assert auth_client.get(f"/api/knowledge-bases/{kb_id}").json()["article_count"] == 2


def test_markdown_upload_takes_its_title_from_the_first_heading(auth_client: TestClient, knowledge_base) -> None:
    response = auth_client.post(
        f"/api/knowledge-bases/{knowledge_base['id']}/upload",
        files={"file": ("sso-guide.md", b"# Single sign-on\n\nConnect Okta under Settings.", "text/markdown")},
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Single sign-on"
    assert response.json()["source"] == "upload"


def test_unsupported_uploads_are_refused(auth_client: TestClient, knowledge_base) -> None:
    response = auth_client.post(
        f"/api/knowledge-bases/{knowledge_base['id']}/upload",
        files={"file": ("guide.pdf", b"%PDF-1.7", "application/pdf")},
    )
    assert response.status_code == 422
