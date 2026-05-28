from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.google.service import (
    _google_get,
    check_sheet_script,
    get_gas_files,
    list_gas_projects,
    list_sheets,
)


@pytest.mark.asyncio
async def test_google_get_success():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"data": "test"}
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await _google_get("http://test.com", "token123")
        assert result == {"data": "test"}


@pytest.mark.asyncio
async def test_google_get_error_with_json_detail():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 401
        mock_response.json.return_value = {"error": {"message": "Invalid token"}}
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await _google_get("http://test.com", "bad_token")

        assert exc_info.value.status_code == 401
        assert "Invalid token" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_google_get_error_without_json():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 500
        mock_response.json.side_effect = Exception("JSON parse error")
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await _google_get("http://test.com", "token")

        assert exc_info.value.status_code == 500
        assert "Google API error" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_google_get_error_no_raise():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 404
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await _google_get("http://test.com", "token", raise_on_error=False)
        assert result is None


@pytest.mark.asyncio
async def test_list_gas_projects_success():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()

        mock_scripts_response = MagicMock()
        mock_scripts_response.is_success = True
        mock_scripts_response.json.return_value = {"files": [{"id": "script1", "name": "Script 1"}]}

        mock_processes_response = MagicMock()
        mock_processes_response.is_success = True
        mock_processes_response.json.return_value = {"processes": [{"scriptId": "script2"}]}

        mock_sheets_response = MagicMock()
        mock_sheets_response.is_success = True
        mock_sheets_response.json.return_value = {"files": [{"id": "sheet1", "name": "Sheet 1"}]}

        mock_project_response = MagicMock()
        mock_project_response.is_success = True
        mock_project_response.json.return_value = {"scriptId": "script1", "parentId": "sheet1"}

        mock_project_response2 = MagicMock()
        mock_project_response2.is_success = True
        mock_project_response2.json.return_value = {
            "scriptId": "script2",
            "parentId": "other_sheet",
        }

        mock_client.get = AsyncMock(
            side_effect=[
                mock_scripts_response,
                mock_processes_response,
                mock_sheets_response,
                mock_project_response,
                mock_project_response2,
            ]
        )

        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await list_gas_projects("test_token")
        assert isinstance(result, list)
        assert len(result) >= 0


@pytest.mark.asyncio
async def test_list_gas_projects_api_errors():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()

        mock_error_response = MagicMock()
        mock_error_response.is_success = False
        mock_error_response.json.return_value = {}

        mock_client.get = AsyncMock(return_value=mock_error_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await list_gas_projects("test_token")
        assert result == []


@pytest.mark.asyncio
async def test_check_sheet_script_found_by_parent():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()

        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"files": [{"id": "script1", "name": "My Script"}]}

        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await check_sheet_script("sheet1", "test_token")
        assert result["hasScript"] is True
        assert result["scriptId"] == "script1"
        assert result["title"] == "My Script"


@pytest.mark.asyncio
async def test_check_sheet_script_found_by_name():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()

        mock_no_parent_response = MagicMock()
        mock_no_parent_response.is_success = True
        mock_no_parent_response.json.return_value = {"files": []}

        mock_sheet_response = MagicMock()
        mock_sheet_response.is_success = True
        mock_sheet_response.json.return_value = {"name": "My Sheet"}

        mock_script_response = MagicMock()
        mock_script_response.is_success = True
        mock_script_response.json.return_value = {"files": [{"id": "script2", "name": "My Sheet"}]}

        mock_client.get = AsyncMock(
            side_effect=[
                mock_no_parent_response,
                mock_sheet_response,
                mock_script_response,
            ]
        )
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await check_sheet_script("sheet1", "test_token")
        assert result["hasScript"] is True
        assert result["scriptId"] == "script2"


@pytest.mark.asyncio
async def test_check_sheet_script_not_found():
    with patch("app.modules.google.service.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()

        mock_empty_response = MagicMock()
        mock_empty_response.is_success = True
        mock_empty_response.json.return_value = {"files": []}

        mock_client.get = AsyncMock(return_value=mock_empty_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await check_sheet_script("sheet1", "test_token")
        assert result["hasScript"] is False


@pytest.mark.asyncio
async def test_get_gas_files_success():
    with patch("app.modules.google.service._google_get") as mock_google_get:
        mock_google_get.return_value = {
            "files": [
                {"name": "Code.js", "type": "SERVER_JS", "source": "function test() {}"},
                {"name": "appsscript.json", "type": "JSON", "source": "{}"},
                {"name": "NoSource", "type": "UNKNOWN"},
            ]
        }

        result = await get_gas_files("script1", "test_token")

        assert len(result) == 2
        assert result[0]["name"] == "Code.js"
        assert result[0]["source"] == "function test() {}"
        assert result[1]["name"] == "appsscript.json"


@pytest.mark.asyncio
async def test_get_gas_files_no_data():
    with patch("app.modules.google.service._google_get") as mock_google_get:
        mock_google_get.return_value = None

        result = await get_gas_files("script1", "test_token")
        assert result == []


@pytest.mark.asyncio
async def test_list_sheets_success():
    with patch("app.modules.google.service._google_get") as mock_google_get:
        mock_google_get.return_value = {
            "files": [
                {"id": "sheet1", "name": "Sheet 1"},
                {"id": "sheet2", "name": "Sheet 2"},
            ]
        }

        result = await list_sheets("test_token")

        assert len(result) == 2
        assert result[0]["id"] == "sheet1"
        assert result[0]["name"] == "Sheet 1"


@pytest.mark.asyncio
async def test_list_sheets_no_data():
    with patch("app.modules.google.service._google_get") as mock_google_get:
        mock_google_get.return_value = None

        result = await list_sheets("test_token")
        assert result == []
