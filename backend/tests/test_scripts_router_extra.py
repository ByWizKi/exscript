from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.core.security import create_access_token
from app.modules.scripts.crud import create_script
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn


def auth_headers(email: str = "test@example.com") -> dict:
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


async def _create_script(db, name="S", gas_id="g1"):
    data = ScriptCreate(
        name=name,
        gas_script_id=gas_id,
        spreadsheet_id="sheet1",
        files=[ScriptFileIn(filename="Code.js", content="", file_type="server_js")],
    )
    return await create_script(data, "test@example.com", db)


@pytest.mark.asyncio
async def test_get_script_not_found(client):
    resp = await client.get("/scripts/99999", headers=auth_headers())
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_script_not_found(client):
    resp = await client.put("/scripts/99999", json={"name": "x"}, headers=auth_headers())
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_script_not_found(client):
    resp = await client.delete("/scripts/99999", headers=auth_headers())
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_pull_script_value_error(client, db):
    script = await _create_script(db, "Pull", "pull_gas")

    with patch("app.modules.scripts.router.sync_pull", new_callable=AsyncMock) as mock_pull:
        mock_pull.side_effect = ValueError("Script non trouvé")
        resp = await client.post(
            f"/scripts/{script.id}/pull",
            json={"access_token": "tok"},
            headers=auth_headers(),
        )
    assert resp.status_code == 400
    assert "Script non trouvé" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_pull_script_generic_error(client, db):
    script = await _create_script(db, "PullErr", "pull_err_gas")

    with patch("app.modules.scripts.router.sync_pull", new_callable=AsyncMock) as mock_pull:
        mock_pull.side_effect = Exception("upstream error")
        resp = await client.post(
            f"/scripts/{script.id}/pull",
            json={"access_token": "tok"},
            headers=auth_headers(),
        )
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_push_script_generic_error(client, db):
    script = await _create_script(db, "PushErr", "push_err_gas")

    with patch("app.modules.scripts.router.sync_push", new_callable=AsyncMock) as mock_push:
        mock_push.side_effect = Exception("push failed")
        resp = await client.post(
            f"/scripts/{script.id}/push",
            json={"access_token": "tok"},
            headers=auth_headers(),
        )
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_add_version_not_found(client):
    resp = await client.post(
        "/scripts/99999/versions",
        json={"files": [], "message": "test"},
        headers=auth_headers(),
    )
    assert resp.status_code == 400
