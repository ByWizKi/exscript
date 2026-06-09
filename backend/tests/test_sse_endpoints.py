from __future__ import annotations

import json

import pytest

from app.core.security import create_access_token


def _auth_headers(email: str = "test@example.com") -> dict:
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


def _parse_sse(body: str) -> list[dict]:
    events = []
    for block in body.strip().split("\n\n"):
        if not block.strip():
            continue
        lines = block.strip().splitlines()
        event_name = "message"
        data_str = ""
        for line in lines:
            if line.startswith("event:"):
                event_name = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data_str = line[len("data:") :].strip()
        if data_str:
            payload = json.loads(data_str)
            payload["event"] = event_name
            events.append(payload)
    return events


async def _make_sse_events(*event_dicts):
    for ev in event_dicts:
        yield ev


@pytest.mark.asyncio
async def test_ai_modify_stream_endpoint_success(client):
    from unittest.mock import patch

    events = [
        {"event": "step", "type": "generating", "message": "Génération en cours…"},
        {"event": "result", "files": [], "version_message": "done"},
        {"event": "done"},
    ]

    with patch(
        "app.modules.scripts.router.stream_ai_modification",
        return_value=_make_sse_events(*events),
    ):
        response = await client.post(
            "/scripts/1/ai-modify-stream",
            json={"prompt": "Ajouter logs", "google_access_token": None},
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    parsed = _parse_sse(response.text)
    event_names = [e["event"] for e in parsed]
    assert "step" in event_names
    assert "result" in event_names
    assert "done" in event_names


@pytest.mark.asyncio
async def test_ai_modify_stream_endpoint_error_propagated(client):
    from unittest.mock import patch

    async def failing_gen():
        yield {"event": "step", "type": "generating", "message": "début"}
        raise RuntimeError("LLM indisponible")

    with patch(
        "app.modules.scripts.router.stream_ai_modification",
        return_value=failing_gen(),
    ):
        response = await client.post(
            "/scripts/1/ai-modify-stream",
            json={"prompt": "test", "google_access_token": None},
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    parsed = _parse_sse(response.text)
    error_events = [e for e in parsed if e["event"] == "error"]
    assert error_events, "Un événement error doit être émis"
    assert "LLM indisponible" in error_events[0].get("message", "")


@pytest.mark.asyncio
async def test_ai_document_stream_endpoint_success(client):
    from unittest.mock import patch

    events = [
        {"event": "step", "type": "generating", "message": "Documentation…"},
        {"event": "result", "files": [], "version_message": "JSDoc"},
        {"event": "done"},
    ]

    with patch(
        "app.modules.scripts.router.stream_ai_document",
        return_value=_make_sse_events(*events),
    ):
        response = await client.post(
            "/scripts/1/ai-document-stream",
            json={"prompt": "", "google_access_token": None},
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    parsed = _parse_sse(response.text)
    assert any(e["event"] == "done" for e in parsed)


@pytest.mark.asyncio
async def test_sse_content_type(client):
    from unittest.mock import patch

    with patch(
        "app.modules.scripts.router.stream_ai_modification",
        return_value=_make_sse_events({"event": "done"}),
    ):
        response = await client.post(
            "/scripts/1/ai-modify-stream",
            json={"prompt": "x", "google_access_token": None},
            headers=_auth_headers(),
        )

    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers.get("cache-control") == "no-cache"


@pytest.mark.asyncio
async def test_sse_ping_event_passes_through(client):
    """Les événements ping (heartbeat) sont bien transmis dans le flux SSE."""
    from unittest.mock import patch

    with patch(
        "app.modules.scripts.router.stream_ai_modification",
        return_value=_make_sse_events(
            {"event": "ping"},
            {"event": "done"},
        ),
    ):
        response = await client.post(
            "/scripts/1/ai-modify-stream",
            json={"prompt": "x", "google_access_token": None},
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    parsed = _parse_sse(response.text)
    assert any(e["event"] == "ping" for e in parsed)
    assert any(e["event"] == "done" for e in parsed)


@pytest.mark.asyncio
async def test_sse_wire_format(client):
    """Vérifie que le format SSE respecte event:/data: sur lignes séparées."""
    from unittest.mock import patch

    with patch(
        "app.modules.scripts.router.stream_ai_modification",
        return_value=_make_sse_events({"event": "step", "type": "generating", "message": "ok"}),
    ):
        response = await client.post(
            "/scripts/1/ai-modify-stream",
            json={"prompt": "x", "google_access_token": None},
            headers=_auth_headers(),
        )

    raw = response.text
    assert "event: step\n" in raw
    assert "data: " in raw
