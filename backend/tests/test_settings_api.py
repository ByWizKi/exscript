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
    assert "model" in data


@pytest.mark.asyncio
async def test_get_llm_settings_unauthenticated(client):
    response = await client.get("/settings/llm")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_llm_settings(client):
    payload = {"model": "gemini-2.5-pro"}
    response = await client.put("/settings/llm", json=payload, headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "gemini-2.5-pro"


@pytest.mark.asyncio
async def test_update_llm_settings_unauthorized(client):
    response = await client.put("/settings/llm", json={"model": "gemini-2.5-flash"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_llm_settings_no_secrets_exposed(client):
    response = await client.get("/settings/llm", headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert "api_key" not in data
    assert "provider" not in data
