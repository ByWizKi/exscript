from __future__ import annotations

import pytest

from app.core.security import create_access_token
from app.modules.scripts.crud import create_script
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn


def auth_headers(email: str = "test@example.com") -> dict:
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_scripts_authenticated(client):
    response = await client.get("/scripts", headers=auth_headers())
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_scripts_unauthenticated(client):
    response = await client.get("/scripts")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_script_via_api(client):
    payload = {
        "name": "API Test Script",
        "gas_script_id": "api_test_123",
        "spreadsheet_id": "sheet_api_123",
        "files": [
            {"filename": "Code.js", "content": "function run() {}", "file_type": "server_js"},
        ],
        "version_message": "Initial",
    }
    response = await client.post("/scripts", json=payload, headers=auth_headers())
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "API Test Script"
    assert data["latest_version"] is not None


@pytest.mark.asyncio
async def test_get_script_by_id(client, db):
    data = ScriptCreate(
        name="Get Test",
        gas_script_id="get_test_456",
        spreadsheet_id="sheet_get",
        files=[ScriptFileIn(filename="Code.js", content="", file_type="server_js")],
    )
    created = await create_script(data, "test@example.com", db)
    response = await client.get(f"/scripts/{created.id}", headers=auth_headers())
    assert response.status_code == 200
    assert response.json()["id"] == created.id


@pytest.mark.asyncio
async def test_get_script_not_found(client):
    response = await client.get("/scripts/99999", headers=auth_headers())
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_add_version_endpoint_returns_201(client, db):
    data = ScriptCreate(
        name="Version API Test",
        gas_script_id="ver_api_789",
        spreadsheet_id="sheet_ver",
        files=[ScriptFileIn(filename="Code.js", content="v1", file_type="server_js")],
    )
    created = await create_script(data, "test@example.com", db)
    payload = {
        "files": [{"filename": "Code.js", "content": "v2 updated", "file_type": "server_js"}],
        "message": "Version 2",
    }
    response = await client.post(
        f"/scripts/{created.id}/versions", json=payload, headers=auth_headers()
    )
    # Verify the endpoint returns 201 Created
    assert response.status_code == 201
    # Verify the response has the expected script structure
    data_response = response.json()
    assert data_response["id"] == created.id
    assert "latest_version" in data_response


@pytest.mark.asyncio
async def test_push_to_gas_unauthorized(client):
    payload = {"access_token": "test-token"}
    response = await client.post("/scripts/1/push", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_script_missing_fields(client):
    payload = {"name": "Incomplete"}
    response = await client.post("/scripts", json=payload, headers=auth_headers())
    assert response.status_code == 422
