import pytest


@pytest.mark.asyncio
async def test_protected_route_without_token_returns_401(client):
    response = await client.get("/scripts")
    assert response.status_code == 401
