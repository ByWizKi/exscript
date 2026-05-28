from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.scripts.crud import create_script
from app.modules.scripts.gas import pull_from_gas, push_to_gas
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn


async def _make_script(db, *, name="Script", gas_id="gas123", files=None):
    files = files or [
        ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")
    ]
    data = ScriptCreate(name=name, gas_script_id=gas_id, spreadsheet_id="sheet1", files=files)
    return await create_script(data, "test@example.com", db)


@pytest.mark.asyncio
async def test_push_to_gas_success(db):
    script = await _make_script(db)

    mock_response = MagicMock()
    mock_response.is_success = True

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client.put = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        await push_to_gas(script.id, "token", db)


@pytest.mark.asyncio
async def test_push_to_gas_api_error_with_json(db):
    script = await _make_script(db)

    mock_response = MagicMock()
    mock_response.is_success = False
    mock_response.status_code = 403
    mock_response.json.return_value = {"error": {"message": "Forbidden"}}

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client.put = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(Exception, match="Forbidden"):
            await push_to_gas(script.id, "bad_token", db)


@pytest.mark.asyncio
async def test_push_to_gas_api_error_no_json(db):
    script = await _make_script(db)

    mock_response = MagicMock()
    mock_response.is_success = False
    mock_response.status_code = 500
    mock_response.json.side_effect = Exception("parse error")

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client.put = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(Exception, match="Erreur Apps Script 500"):
            await push_to_gas(script.id, "bad_token", db)


@pytest.mark.asyncio
async def test_push_to_gas_no_version(db):
    data = ScriptCreate(
        name="Empty",
        gas_script_id="gas_empty",
        spreadsheet_id="sheet1",
        files=[],
    )
    script = await create_script(data, "test@example.com", db)

    with pytest.raises(ValueError, match="Aucun fichier"):
        await push_to_gas(script.id, "token", db)


@pytest.mark.asyncio
async def test_pull_from_gas_not_found(db):
    with pytest.raises(ValueError, match="Script non trouvé"):
        await pull_from_gas(99999, "token", "test@example.com", db)


@pytest.mark.asyncio
async def test_pull_from_gas_success(db):
    script = await _make_script(db)

    mock_response = MagicMock()
    mock_response.is_success = True
    mock_response.json.return_value = {
        "files": [
            {"name": "Code", "type": "SERVER_JS", "source": "function hello() {}"},
        ]
    }

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await pull_from_gas(script.id, "token", "test@example.com", db)
    assert result is not None


@pytest.mark.asyncio
async def test_pull_from_gas_empty_files(db):
    script = await _make_script(db)

    mock_response = MagicMock()
    mock_response.is_success = True
    mock_response.json.return_value = {"files": []}

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Aucun fichier"):
            await pull_from_gas(script.id, "token", "test@example.com", db)


@pytest.mark.asyncio
async def test_pull_from_gas_api_error(db):
    script = await _make_script(db)

    mock_response = MagicMock()
    mock_response.is_success = False
    mock_response.status_code = 401
    mock_response.json.return_value = {"error": {"message": "Unauthorized"}}

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(Exception, match="Unauthorized"):
            await pull_from_gas(script.id, "token", "test@example.com", db)
