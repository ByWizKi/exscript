from __future__ import annotations

import pytest

from app.core.security import create_access_token


def auth_headers(email: str = "test@example.com") -> dict:
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_llm_settings_authenticated(client):
    response = await client.get("/settings/llm", headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "model" in data


@pytest.mark.asyncio
async def test_get_llm_settings_unauthenticated(client):
    response = await client.get("/settings/llm")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_llm_settings(client):
    payload = {
        "provider": "anthropic",
        "model": "claude-3-haiku-20240307",
        "api_key": "test-key-xyz",
        "base_url": "",
    }
    response = await client.put("/settings/llm", json=payload, headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "anthropic"
    assert data["model"] == "claude-3-haiku-20240307"


@pytest.mark.asyncio
async def test_update_llm_settings_without_api_key(client):
    payload = {
        "provider": "openai",
        "model": "gpt-4o",
        "base_url": "https://custom.openai.com",
    }
    response = await client.put("/settings/llm", json=payload, headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai"


@pytest.mark.asyncio
async def test_update_llm_settings_unauthorized(client):
    payload = {"provider": "anthropic", "model": "claude-3-haiku-20240307", "api_key": "test"}
    response = await client.put("/settings/llm", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_llm_settings_returns_no_api_key(client):
    # First save a key
    payload = {
        "provider": "openai",
        "model": "gpt-4o",
        "api_key": "secret-should-not-leak",
        "base_url": "",
    }
    await client.put("/settings/llm", json=payload, headers=auth_headers())

    # Then fetch and verify key is not exposed
    response = await client.get("/settings/llm", headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert "api_key" not in data or data.get("api_key") is None
    assert data.get("api_key_set") is True
