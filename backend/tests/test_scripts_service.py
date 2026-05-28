from __future__ import annotations

import pytest

from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn
from app.modules.scripts.service import create_script, get_script, list_scripts


@pytest.mark.asyncio
async def test_create_script(db):
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="abc123",
        spreadsheet_id="sheet456",
        files=[
            ScriptFileIn(
                filename="Code.js", content="function test() {}", file_type="server_js"
            )
        ],
    )
    script = await create_script(data, "test@example.com", db)
    assert script.id is not None
    assert script.name == "Test Script"
    assert script.owner_email == "test@example.com"


@pytest.mark.asyncio
async def test_get_script_returns_none_for_missing(db):
    result = await get_script(99999, db)
    assert result is None


@pytest.mark.asyncio
async def test_get_script_returns_script_with_files(db):
    data = ScriptCreate(
        name="Script With Files",
        gas_script_id="xyz789",
        spreadsheet_id="sheet000",
        files=[
            ScriptFileIn(filename="Code.js", content="// main", file_type="server_js"),
            ScriptFileIn(filename="Utils.js", content="// utils", file_type="server_js"),
        ],
    )
    created = await create_script(data, "owner@example.com", db)
    fetched = await get_script(created.id, db)
    assert fetched is not None
    assert fetched.versions is not None
    assert len(fetched.versions) > 0
    assert len(fetched.versions[0].files) == 2


@pytest.mark.asyncio
async def test_list_scripts_returns_created(db):
    data = ScriptCreate(
        name="Listed Script",
        gas_script_id="list123",
        spreadsheet_id="sheet_list",
        files=[ScriptFileIn(filename="Code.js", content="", file_type="server_js")],
    )
    await create_script(data, "user@example.com", db)
    scripts = await list_scripts(db)
    assert len(scripts) >= 1
    assert any(s["name"] == "Listed Script" for s in scripts)
