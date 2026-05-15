from __future__ import annotations

import pytest

from app.modules.scripts.gas import FILE_TYPE_TO_GAS, push_to_gas
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn
from app.modules.scripts.crud import create_script


def test_file_type_to_gas_mapping():
    assert FILE_TYPE_TO_GAS["server_js"] == "SERVER_JS"
    assert FILE_TYPE_TO_GAS["html"] == "HTML"
    assert FILE_TYPE_TO_GAS["json"] == "JSON"


@pytest.mark.asyncio
async def test_push_to_gas_with_missing_script(db):
    # Test pushing non-existent script
    with pytest.raises(ValueError, match="Script non trouvé"):
        await push_to_gas(99999, "fake_token", db)


@pytest.mark.asyncio
async def test_push_to_gas_with_invalid_token(db):
    # Create a script first
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="test_id_123",
        spreadsheet_id="sheet123",
        files=[ScriptFileIn(filename="Code.js", content="test", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    # Try to push with invalid token
    with pytest.raises(Exception):
        # This will fail because we don't have a real Google token
        # But it should raise an exception (not ValueError about missing script)
        await push_to_gas(script.id, "invalid_token_xyz", db)
