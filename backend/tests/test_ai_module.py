from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.llm.base import LLMMessage
from app.modules.scripts.ai import _fetch_sheets_context, ai_modify_script
from app.modules.scripts.crud import create_script
from app.modules.scripts.schemas import ScriptCreate, ScriptFileIn


@pytest.mark.asyncio
async def test_fetch_sheets_context_success():
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "properties": {"title": "Test Spreadsheet"},
            "sheets": [
                {
                    "properties": {"title": "Sheet1"},
                    "data": [
                        {
                            "rowData": [
                                {
                                    "values": [
                                        {"formattedValue": "Header1"},
                                        {"formattedValue": "Header2"},
                                    ]
                                },
                                {
                                    "values": [
                                        {"formattedValue": "Value1"},
                                        {"formattedValue": "Value2"},
                                    ]
                                },
                            ]
                        }
                    ],
                }
            ],
        }

        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await _fetch_sheets_context("sheet123", "test_token")

        assert "Test Spreadsheet" in result
        assert "Sheet1" in result
        assert "Header1" in result
        assert "Value1" in result


@pytest.mark.asyncio
async def test_fetch_sheets_context_api_error():
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = False

        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await _fetch_sheets_context("sheet123", "test_token")

        assert result == ""


@pytest.mark.asyncio
async def test_fetch_sheets_context_empty_sheets():
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"properties": {"title": "Empty Sheet"}, "sheets": []}

        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await _fetch_sheets_context("sheet123", "test_token")

        assert "Empty Sheet" in result
        assert "Feuille" not in result


@pytest.mark.asyncio
async def test_fetch_sheets_context_with_empty_cells():
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "properties": {"title": "Sheet with Empties"},
            "sheets": [
                {
                    "properties": {"title": "Data"},
                    "data": [
                        {
                            "rowData": [
                                {
                                    "values": [
                                        {"formattedValue": "A"},
                                        {"formattedValue": "B"},
                                        {},
                                    ]
                                },
                                {
                                    "values": [
                                        {"formattedValue": "1"},
                                        {},
                                    ]
                                },
                                {"values": []},
                            ]
                        }
                    ],
                }
            ],
        }

        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await _fetch_sheets_context("sheet123", "test_token")

        assert "Sheet with Empties" in result
        assert "A | B" in result


@pytest.mark.asyncio
async def test_ai_modify_script_not_found(db):
    with pytest.raises(ValueError, match="Script not found"):
        await ai_modify_script(
            script_id=99999,
            prompt="test",
            db=db,
        )


@pytest.mark.asyncio
async def test_ai_modify_script_no_versions(db):
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="test_id",
        spreadsheet_id="sheet123",
        files=[],
    )
    script = await create_script(data, "test@example.com", db)

    with pytest.raises(ValueError, match="No files found"):
        await ai_modify_script(
            script_id=script.id,
            prompt="test",
            db=db,
        )


@pytest.mark.asyncio
async def test_ai_modify_script_success(db):
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="test_id",
        spreadsheet_id="sheet123",
        files=[
            ScriptFileIn(filename="Code.js", content="function test() {}", file_type="server_js"),
        ],
    )
    script = await create_script(data, "test@example.com", db)

    with patch("app.modules.scripts.ai._fetch_sheets_context") as mock_fetch_sheets:
        mock_fetch_sheets.return_value = ""

        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = AsyncMock()
            mock_get_provider.return_value = mock_provider

            json_response = (
                '{"files": [{"filename": "Code.js", "content": "modified",'
                ' "file_type": "server_js"}], "version_message": "Added console.log"}'
            )
            mock_provider.complete = AsyncMock(return_value=json_response)

            result = await ai_modify_script(
                script_id=script.id,
                prompt="Add console.log",
                db=db,
            )

            assert "files" in result
            assert "version_message" in result
            assert result["version_message"] == "Added console.log"


@pytest.mark.asyncio
async def test_ai_modify_script_with_sheets_context(db):
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="test_id",
        spreadsheet_id="sheet123",
        files=[
            ScriptFileIn(filename="Code.js", content="function test() {}", file_type="server_js"),
        ],
    )
    script = await create_script(data, "test@example.com", db)

    with patch("app.modules.scripts.ai._fetch_sheets_context") as mock_fetch_sheets:
        mock_fetch_sheets.return_value = "Spreadsheet: My Data"

        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = AsyncMock()
            mock_get_provider.return_value = mock_provider

            json_response = (
                '{"files": [{"filename": "Code.js", "content": "modified",'
                ' "file_type": "server_js"}], "version_message": "Modified"}'
            )
            mock_provider.complete = AsyncMock(return_value=json_response)

            result = await ai_modify_script(
                script_id=script.id,
                prompt="test",
                db=db,
                google_access_token="test_token",
            )

            assert result["files"][0]["content"] == "modified"
            mock_fetch_sheets.assert_called_once()


@pytest.mark.asyncio
async def test_ai_modify_script_invalid_json(db):
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="test_id",
        spreadsheet_id="sheet123",
        files=[
            ScriptFileIn(filename="Code.js", content="function test() {}", file_type="server_js"),
        ],
    )
    script = await create_script(data, "test@example.com", db)

    with patch("app.modules.scripts.ai._fetch_sheets_context") as mock_fetch_sheets:
        mock_fetch_sheets.return_value = ""

        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = AsyncMock()
            mock_get_provider.return_value = mock_provider

            mock_provider.complete = AsyncMock(return_value="This is not JSON")

            with pytest.raises(ValueError, match="LLM did not return valid JSON"):
                await ai_modify_script(
                    script_id=script.id,
                    prompt="test",
                    db=db,
                )


@pytest.mark.asyncio
async def test_ai_modify_script_with_history(db):
    data = ScriptCreate(
        name="Test Script",
        gas_script_id="test_id",
        spreadsheet_id="sheet123",
        files=[
            ScriptFileIn(filename="Code.js", content="function test() {}", file_type="server_js"),
        ],
    )
    script = await create_script(data, "test@example.com", db)

    with patch("app.modules.scripts.ai._fetch_sheets_context") as mock_fetch_sheets:
        mock_fetch_sheets.return_value = ""

        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = AsyncMock()
            mock_get_provider.return_value = mock_provider

            json_response = (
                '{"files": [{"filename": "Code.js", "content": "modified",'
                ' "file_type": "server_js"}], "version_message": "Updated"}'
            )
            mock_provider.complete = AsyncMock(return_value=json_response)

            history = [
                LLMMessage(role="user", content="First request"),
                LLMMessage(role="assistant", content="First response"),
            ]

            await ai_modify_script(
                script_id=script.id,
                prompt="Second request",
                db=db,
                history=history,
            )

            call_args = mock_provider.complete.call_args
            messages = call_args[0][0]
            assert len(messages) >= 3
