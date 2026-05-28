from __future__ import annotations

import pytest

from app.modules.scripts.crud import create_script, delete_script, get_script, update_script
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn, ScriptUpdate


@pytest.mark.asyncio
async def test_update_script_not_found(db):
    result = await update_script(99999, ScriptUpdate(name="New"), db)
    assert result is None


@pytest.mark.asyncio
async def test_update_script_fields(db):
    data = ScriptCreate(
        name="Original",
        gas_script_id="gas1",
        spreadsheet_id="sheet1",
        files=[ScriptFileIn(filename="Code.js", content="", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)
    updated = await update_script(script.id, ScriptUpdate(name="Updated", gas_script_id="gas2"), db)
    assert updated.name == "Updated"
    assert updated.gas_script_id == "gas2"
    assert updated.spreadsheet_id == "sheet1"


@pytest.mark.asyncio
async def test_delete_script_not_found(db):
    result = await delete_script(99999, db)
    assert result is False


@pytest.mark.asyncio
async def test_delete_script_success(db):
    data = ScriptCreate(
        name="ToDelete",
        gas_script_id="gas_del",
        spreadsheet_id="sheet_del",
        files=[ScriptFileIn(filename="Code.js", content="", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)
    result = await delete_script(script.id, db)
    assert result is True
    assert await get_script(script.id, db) is None
