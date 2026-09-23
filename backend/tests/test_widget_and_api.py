"""The public widget surface, allowed origins, and the /v1/ask API."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient


def widget_post(client: TestClient, project: str, question: str, origin: str | None = None):
    headers = {"Content-Type": "text/plain;charset=UTF-8"}
    if origin:
        headers["Origin"] = origin
    return client.post(
        "/widget/chat", content=json.dumps({"project": project, "question": question}), headers=headers
    )


def test_the_widget_answers_with_only_a_public_id(auth_client: TestClient, knowledge_base) -> None:
    project = knowledge_base["public_id"]
    auth_client.cookies.clear()  # a website visitor has no session

    config = auth_client.get(f"/widget/config/{project}", headers={"Origin": "https://shop.example"})
    assert config.status_code == 200
    assert set(config.json()) == {"title", "welcome_message", "accent_color", "position"}

    response = widget_post(auth_client, project, "How do I reset my password?", "https://shop.example")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "answered"
    assert body["sources"][0]["title"] == "Authentication"
    assert response.headers["Access-Control-Allow-Origin"] == "https://shop.example"


def test_widget_conversations_are_recorded_without_visitor_data(auth_client: TestClient, knowledge_base) -> None:
    widget_post(auth_client, knowledge_base["public_id"], "How do I reset my password?")
    conversation = auth_client.get("/api/conversations", params={"channel": "widget"}).json()["items"][0]
    assert conversation["channel"] == "widget"
    assert not {"ip", "client_ip", "user_agent", "visitor"} & set(conversation)


def test_allowed_domains_are_enforced_server_side(auth_client: TestClient, knowledge_base) -> None:
    kb_id = knowledge_base["id"]
    saved = auth_client.put(
        f"/api/knowledge-bases/{kb_id}/widget",
        json={"allowed_domains": ["https://docs.acme.com/", "*.acme.dev"]},
    )
    assert saved.status_code == 200
    assert saved.json()["allowed_domains"] == ["*.acme.dev", "docs.acme.com"]

    project = knowledge_base["public_id"]
    assert widget_post(auth_client, project, "How do I reset my password?", "https://docs.acme.com").status_code == 200
    assert widget_post(auth_client, project, "How do I reset my password?", "https://help.acme.dev").status_code == 200

    # CORS alone would not stop a script: the handler refuses outright.
    refused = widget_post(auth_client, project, "How do I reset my password?", "https://evil.example")
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "origin_not_allowed"
    assert widget_post(auth_client, project, "How do I reset my password?").status_code == 403


def test_invalid_domains_are_rejected(auth_client: TestClient, knowledge_base) -> None:
    response = auth_client.put(
        f"/api/knowledge-bases/{knowledge_base['id']}/widget",
        json={"allowed_domains": ["not a domain!"]},
    )
    assert response.status_code == 422


def test_the_widget_is_rate_limited_per_visitor(auth_client: TestClient, knowledge_base) -> None:
    project = knowledge_base["public_id"]
    codes = [widget_post(auth_client, project, "How do I reset my password?").status_code for _ in range(6)]
    assert codes[:5] == [200] * 5
    assert codes[5] == 429


def test_an_unknown_or_disabled_widget_is_unavailable(auth_client: TestClient, knowledge_base) -> None:
    assert widget_post(auth_client, "kb_does_not_exist", "hello there").status_code == 404
    auth_client.put(f"/api/knowledge-bases/{knowledge_base['id']}/widget", json={"enabled": False})
    assert widget_post(auth_client, knowledge_base["public_id"], "hello there").status_code == 404


def test_the_widget_script_is_served(client: TestClient) -> None:
    response = client.get("/widget.js")
    assert response.status_code == 200
    assert "attachShadow" in response.text
    assert "innerHTML = icon" in response.text  # static SVG only …
    assert "textContent = text" in response.text  # … answers are text


def test_api_keys_are_shown_once_and_stored_hashed(auth_client: TestClient) -> None:
    import hashlib

    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models import APIKey

    created = auth_client.post("/api/keys", json={"name": "Backend"}).json()
    assert created["key"].startswith("rsv_live_")
    assert "key" not in auth_client.get("/api/keys").json()[0]
    with SessionLocal() as db:
        stored = db.execute(select(APIKey)).scalar_one()
    assert stored.hashed_key == hashlib.sha256(created["key"].encode()).hexdigest()


def test_v1_ask_requires_a_valid_key(auth_client: TestClient, knowledge_base) -> None:
    body = {"knowledge_base_id": knowledge_base["id"], "question": "How do I reset my password?"}
    key = auth_client.post("/api/keys", json={"name": "Backend"}).json()
    auth_client.cookies.clear()  # server-to-server: no session

    assert auth_client.post("/v1/ask", json=body).status_code == 401
    assert auth_client.post("/v1/ask", json=body, headers={"X-API-Key": "rsv_live_nope"}).status_code == 401

    answered = auth_client.post("/v1/ask", json=body, headers={"X-API-Key": key["key"]})
    assert answered.status_code == 200
    assert answered.json()["status"] == "answered"
    assert answered.json()["sources"][0]["title"] == "Authentication"


def test_a_revoked_key_stops_working(auth_client: TestClient, knowledge_base) -> None:
    key = auth_client.post("/api/keys", json={"name": "Backend"}).json()
    auth_client.post(f"/api/keys/{key['id']}/revoke")
    auth_client.cookies.clear()
    response = auth_client.post(
        "/v1/ask",
        json={"knowledge_base_id": knowledge_base["id"], "question": "How do I reset my password?"},
        headers={"X-API-Key": key["key"]},
    )
    assert response.status_code == 401


def test_a_key_cannot_reach_another_accounts_knowledge_base(
    auth_client: TestClient, knowledge_base, switch_user
) -> None:
    switch_user()
    key = auth_client.post("/api/keys", json={"name": "Other"}).json()
    response = auth_client.post(
        "/v1/ask",
        json={"knowledge_base_id": knowledge_base["id"], "question": "How do I reset my password?"},
        headers={"X-API-Key": key["key"]},
    )
    assert response.status_code == 404


def test_the_overview_counts_come_from_conversations(auth_client: TestClient, knowledge_base) -> None:
    kb_id = knowledge_base["id"]
    auth_client.post("/api/chat", json={"knowledge_base_id": kb_id, "question": "How do I reset my password?"})
    auth_client.post("/api/chat", json={"knowledge_base_id": kb_id, "question": "Is there an Android app?"})

    overview = auth_client.get("/api/overview").json()
    assert overview["articles"] == 3
    assert overview["questions_today"] == 2
    assert overview["answered"] == 1
    assert overview["unresolved"] == 1
    assert overview["top_articles"][0]["title"] == "Authentication"
    assert len(overview["series"]) == 14
