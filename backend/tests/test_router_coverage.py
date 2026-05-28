from __future__ import annotations

import pytest

from app.core.security import create_access_token


def auth_headers(email: str = "test@example.com") -> dict:
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_ai_modify_endpoint_missing_script(client):
    # Test AI modify on non-existent script
    payload = {
        "prompt": "Add a function",
        "google_access_token": None,
        "history": [],
    }
    response = await client.post("/scripts/99999/ai-modify", json=payload, headers=auth_headers())
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_get_current_email_missing_token(client):
    # Test endpoint that requires auth without token
    response = await client.get("/scripts")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_valid_token_gets_scripts(client):
    # Test that a valid token allows access to protected route
    token = create_access_token({"sub": "test@example.com"})
    response = await client.get("/scripts", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_push_to_gas_missing_script(client):
    payload = {"access_token": "test"}
    response = await client.post("/scripts/99999/push", json=payload, headers=auth_headers())
    assert response.status_code == 400
