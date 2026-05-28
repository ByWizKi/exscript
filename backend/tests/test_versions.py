from __future__ import annotations

import pytest

from app.modules.scripts.crud import add_version, create_script, get_script
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn


@pytest.mark.asyncio
async def test_add_version_succeeds(db):
    data = ScriptCreate(
        name="Versioned Script",
        gas_script_id="v123",
        spreadsheet_id="sheet_v",
        files=[ScriptFileIn(filename="Code.js", content="v1", file_type="server_js")],
    )
    created = await create_script(data, "user@test.com", db)
    assert created.id is not None

    # Add a second version
    files = [ScriptFileIn(filename="Code.js", content="v2", file_type="server_js")]
    updated = await add_version(created.id, files, "Version 2", "user@test.com", db)

    # Verify that add_version returned a script
    assert updated is not None
    assert updated.id == created.id


@pytest.mark.asyncio
async def test_add_version_to_missing_script_raises(db):
    files = [ScriptFileIn(filename="Code.js", content="", file_type="server_js")]
    with pytest.raises(ValueError, match="Script not found"):
        await add_version(99999, files, "msg", "user@test.com", db)


@pytest.mark.asyncio
async def test_latest_version_property(db):
    data = ScriptCreate(
        name="PropTest",
        gas_script_id="prop123",
        spreadsheet_id="sheet_prop",
        files=[ScriptFileIn(filename="Code.js", content="", file_type="server_js")],
    )
    created = await create_script(data, "user@test.com", db)
    script = await get_script(created.id, db)
    assert script is not None
    assert script.latest_version is not None
    assert script.latest_version.version_number == 1
