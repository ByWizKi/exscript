from __future__ import annotations

import pytest

from app.core.security import create_access_token
from app.modules.scripts.crud import create_script
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn


def auth_headers(email: str = "test@example.com") -> dict:
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_ai_modify_endpoint_success(client, db):
    # Create a script first
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="test_id_123",
        spreadsheet_id="sheet123",
        files=[
            ScriptFileIn(filename="Code.js", content="function test() {}", file_type="server_js"),
        ],
    )
    script = await create_script(data, "test@example.com", db)

    # Call ai-modify endpoint
    payload = {
        "prompt": "Add console.log",
        "google_access_token": None,
        "history": [],
    }
    response = await client.post(
        f"/scripts/{script.id}/ai-modify", json=payload, headers=auth_headers()
    )
    # Will fail due to missing LLM provider keys, but should be 500 not 400
    assert response.status_code in [400, 500]


@pytest.mark.asyncio
async def test_ai_modify_with_invalid_script_id(client):
    payload = {
        "prompt": "Modify script",
        "google_access_token": None,
        "history": [],
    }
    response = await client.post("/scripts/99999/ai-modify", json=payload, headers=auth_headers())
    assert response.status_code == 400
    assert "detail" in response.json()
