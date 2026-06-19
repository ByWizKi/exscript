from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.llm.base import LLMMessage
from app.modules.scripts.ai import (
    _fetch_sheets_context,
    _parse_llm_json,
    ai_chat_stream,
    ai_document_script_stream,
    ai_modify_script,
    ai_modify_script_stream,
)
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


async def _collect_events(gen) -> list[dict]:
    """Drainer un générateur async et retourner la liste des events."""
    events = []
    async for event in gen:
        events.append(event)
    return events


@pytest.mark.asyncio
async def test_ai_modify_stream_success_first_attempt(db):
    """Succès au 1er tour : events step(generating), step(validating), step(done), result, done."""
    data = ScriptCreate(
        name="Stream Test",
        gas_script_id="stream_id",
        spreadsheet_id="sheet_stream",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    json_response = (
        '{"files": [{"filename": "Code.js", "content": "modified",'
        ' "file_type": "server_js"}], "version_message": "Done"}'
    )

    async def fake_stream(messages):
        yield json_response

    with patch("app.modules.scripts.ai._fetch_sheets_context", return_value=""):
        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.complete_stream = fake_stream
            mock_get_provider.return_value = mock_provider

            events = await _collect_events(
                ai_modify_script_stream(script_id=script.id, prompt="change it", db=db)
            )

    event_types = [e["event"] for e in events]
    assert "step" in event_types
    assert "result" in event_types
    assert "done" in event_types
    assert "error" not in event_types

    step_types = [e["data"]["type"] for e in events if e["event"] == "step"]
    assert "generating" in step_types
    assert "validating" in step_types

    result_event = next(e for e in events if e["event"] == "result")
    assert "files" in result_event["data"]
    assert result_event["data"]["version_message"] == "Done"


@pytest.mark.asyncio
async def test_ai_modify_stream_with_correction(db):
    """La boucle de correction produit un event step(fixing) au 2e tour."""
    data = ScriptCreate(
        name="Correction Test",
        gas_script_id="corr_id",
        spreadsheet_id="sheet_corr",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    bad_response = (
        '{"files": [{"filename": "Code.js", "content": "console.log(1)",'
        ' "file_type": "server_js"}], "version_message": "v1"}'
    )
    good_response = (
        '{"files": [{"filename": "Code.js", "content": "Logger.log(1)",'
        ' "file_type": "server_js"}], "version_message": "v2"}'
    )

    call_count = 0

    async def fake_stream(messages):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            yield bad_response
        else:
            yield good_response

    with patch("app.modules.scripts.ai._fetch_sheets_context", return_value=""):
        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.complete_stream = fake_stream
            mock_get_provider.return_value = mock_provider

            events = await _collect_events(
                ai_modify_script_stream(script_id=script.id, prompt="log something", db=db)
            )

    step_types = [e["data"]["type"] for e in events if e["event"] == "step"]
    assert "fixing" in step_types
    assert "error" not in [e["event"] for e in events]


@pytest.mark.asyncio
async def test_ai_modify_stream_llm_error(db):
    """Erreur LLM → event error émis, pas de event result."""
    data = ScriptCreate(
        name="Error Test",
        gas_script_id="err_id",
        spreadsheet_id="sheet_err",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    async def fake_stream_error(messages):
        raise RuntimeError("LLM unavailable")
        yield  # make it a generator

    with patch("app.modules.scripts.ai._fetch_sheets_context", return_value=""):
        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.complete_stream = fake_stream_error
            mock_get_provider.return_value = mock_provider

            events = await _collect_events(
                ai_modify_script_stream(script_id=script.id, prompt="test", db=db)
            )

    event_types = [e["event"] for e in events]
    assert "error" in event_types
    assert "result" not in event_types

    error_event = next(e for e in events if e["event"] == "error")
    assert "LLM unavailable" in error_event["data"]["detail"]


@pytest.mark.asyncio
async def test_ai_modify_stream_invalid_json(db):
    """JSON invalide du LLM → event error avec message lisible."""
    data = ScriptCreate(
        name="BadJSON Test",
        gas_script_id="json_err_id",
        spreadsheet_id="sheet_json_err",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    async def fake_stream_bad_json(messages):
        yield "this is not json at all"

    with patch("app.modules.scripts.ai._fetch_sheets_context", return_value=""):
        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.complete_stream = fake_stream_bad_json
            mock_get_provider.return_value = mock_provider

            events = await _collect_events(
                ai_modify_script_stream(script_id=script.id, prompt="test", db=db)
            )

    event_types = [e["event"] for e in events]
    assert "error" in event_types
    assert "result" not in event_types


@pytest.mark.asyncio
async def test_ai_modify_stream_not_found(db):
    """Script introuvable → event error."""
    events = await _collect_events(ai_modify_script_stream(script_id=99999, prompt="test", db=db))
    assert any(e["event"] == "error" for e in events)


@pytest.mark.asyncio
async def test_ai_modify_stream_event_order(db):
    """L'event generating doit précéder validating, qui précède result."""
    data = ScriptCreate(
        name="Order Test",
        gas_script_id="order_id",
        spreadsheet_id="sheet_order",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    json_response = (
        '{"files": [{"filename": "Code.js", "content": "ok",'
        ' "file_type": "server_js"}], "version_message": "ok"}'
    )

    async def fake_stream(messages):
        yield json_response

    with patch("app.modules.scripts.ai._fetch_sheets_context", return_value=""):
        with patch("app.llm.factory.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.complete_stream = fake_stream
            mock_get_provider.return_value = mock_provider

            events = await _collect_events(
                ai_modify_script_stream(script_id=script.id, prompt="test", db=db)
            )

    indexed = [(i, e) for i, e in enumerate(events)]
    generating_idx = next(
        i for i, e in indexed if e["event"] == "step" and e["data"]["type"] == "generating"
    )
    validating_idx = next(
        i for i, e in indexed if e["event"] == "step" and e["data"]["type"] == "validating"
    )
    result_idx = next(i for i, e in indexed if e["event"] == "result")

    assert generating_idx < validating_idx < result_idx


@pytest.mark.asyncio
async def test_ai_document_stream_success(db):
    """ai_document_script_stream produit result + done."""
    data = ScriptCreate(
        name="Doc Stream Test",
        gas_script_id="doc_stream_id",
        spreadsheet_id="sheet_doc",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    json_response = (
        '{"files": [{"filename": "Code.js",'
        ' "content": "/** @return {void} */\\nfunction f(){}",'
        ' "file_type": "server_js"}], "version_message": "JSDoc added"}'
    )

    async def fake_stream(messages):
        yield json_response

    with patch("app.llm.factory.get_provider") as mock_get_provider:
        mock_provider = MagicMock()
        mock_provider.complete_stream = fake_stream
        mock_get_provider.return_value = mock_provider

        events = await _collect_events(ai_document_script_stream(script_id=script.id, db=db))

    event_types = [e["event"] for e in events]
    assert "result" in event_types
    assert "done" in event_types
    assert "error" not in event_types


@pytest.mark.asyncio
async def test_ai_document_stream_no_js_files(db):
    """Aucun fichier JS → event result immédiat avec message spécial."""
    data = ScriptCreate(
        name="No JS Test",
        gas_script_id="no_js_id",
        spreadsheet_id="sheet_no_js",
        files=[ScriptFileIn(filename="index.html", content="<html/>", file_type="html")],
    )
    script = await create_script(data, "test@example.com", db)

    events = await _collect_events(ai_document_script_stream(script_id=script.id, db=db))

    event_types = [e["event"] for e in events]
    assert "result" in event_types
    assert "error" not in event_types


@pytest.mark.asyncio
async def test_ai_chat_stream_modification(db):
    """ai_chat_stream retourne event result quand le LLM modifie des fichiers."""
    data = ScriptCreate(
        name="Chat Test",
        gas_script_id="chat_id",
        spreadsheet_id="sheet_chat",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    json_response = (
        '{"files": [{"filename": "Code.js", "content": "function f(){ return 1; }",'
        ' "file_type": "server_js"}], "version_message": "Ajout retour"}'
    )

    async def fake_stream(messages):
        yield json_response

    with patch("app.llm.factory.get_provider") as mock_get_provider:
        mock_provider = MagicMock()
        mock_provider.complete_stream = fake_stream
        mock_get_provider.return_value = mock_provider

        events = await _collect_events(
            ai_chat_stream(
                script_id=script.id,
                prompt="Ajoute un return 1",
                db=db,
                owner_email="test@example.com",
            )
        )

    event_types = [e["event"] for e in events]
    assert "result" in event_types
    assert "done" in event_types
    assert "error" not in event_types

    result_event = next(e for e in events if e["event"] == "result")
    assert "files" in result_event["data"]
    assert "version_message" in result_event["data"]
    assert "version_id" in result_event["data"]


@pytest.mark.asyncio
async def test_ai_chat_stream_message(db):
    """ai_chat_stream retourne event message quand le LLM répond en texte."""
    data = ScriptCreate(
        name="Chat Message Test",
        gas_script_id="chat_msg_id",
        spreadsheet_id="sheet_msg",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    json_response = '{"message": "Ce script fait X, Y et Z."}'

    async def fake_stream(messages):
        yield json_response

    with patch("app.llm.factory.get_provider") as mock_get_provider:
        mock_provider = MagicMock()
        mock_provider.complete_stream = fake_stream
        mock_get_provider.return_value = mock_provider

        events = await _collect_events(
            ai_chat_stream(
                script_id=script.id,
                prompt="Explique ce script",
                db=db,
                owner_email="test@example.com",
            )
        )

    event_types = [e["event"] for e in events]
    assert "message" in event_types
    assert "done" in event_types
    assert "result" not in event_types
    assert "error" not in event_types

    msg_event = next(e for e in events if e["event"] == "message")
    assert "text" in msg_event["data"]


@pytest.mark.asyncio
async def test_ai_chat_stream_invalid_json(db):
    """JSON invalide → event error."""
    data = ScriptCreate(
        name="Chat JSON Error",
        gas_script_id="chat_json_err",
        spreadsheet_id="sheet_json_err2",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    async def fake_stream(messages):
        yield "not json at all"

    with patch("app.llm.factory.get_provider") as mock_get_provider:
        mock_provider = MagicMock()
        mock_provider.complete_stream = fake_stream
        mock_get_provider.return_value = mock_provider

        events = await _collect_events(
            ai_chat_stream(
                script_id=script.id,
                prompt="test",
                db=db,
                owner_email="test@example.com",
            )
        )

    event_types = [e["event"] for e in events]
    assert "error" in event_types
    assert "result" not in event_types


@pytest.mark.asyncio
async def test_ai_chat_stream_unknown_file_ignored(db):
    """Fichier inconnu retourné par le LLM → ignoré silencieusement."""
    data = ScriptCreate(
        name="Chat Unknown File",
        gas_script_id="chat_unk_id",
        spreadsheet_id="sheet_unk",
        files=[ScriptFileIn(filename="Code.js", content="function f(){}", file_type="server_js")],
    )
    script = await create_script(data, "test@example.com", db)

    json_response = (
        '{"files": [{"filename": "Unknown.js", "content": "bad",'
        ' "file_type": "server_js"}], "version_message": "Should be ignored"}'
    )

    async def fake_stream(messages):
        yield json_response

    with patch("app.llm.factory.get_provider") as mock_get_provider:
        mock_provider = MagicMock()
        mock_provider.complete_stream = fake_stream
        mock_get_provider.return_value = mock_provider

        events = await _collect_events(
            ai_chat_stream(
                script_id=script.id,
                prompt="test",
                db=db,
                owner_email="test@example.com",
            )
        )

    # Le fichier inconnu est ignoré → files est vide → ni result ni message
    # Le LLM n'a retourné que des fichiers inconnus → traité comme erreur
    event_types = [e["event"] for e in events]
    assert "error" in event_types


@pytest.mark.asyncio
async def test_ai_chat_stream_script_not_found(db):
    """Script inexistant → event error."""
    events = await _collect_events(
        ai_chat_stream(script_id=99999, prompt="test", db=db, owner_email="test@example.com")
    )
    assert any(e["event"] == "error" for e in events)


class TestParseLlmJson:
    def test_valid_json(self):
        raw = '{"files": [{"filename": "Code.js", "content": "hello"}]}'
        result = _parse_llm_json(raw)
        assert result["files"][0]["filename"] == "Code.js"

    def test_markdown_fence_stripped(self):
        raw = '```json\n{"files": []}\n```'
        result = _parse_llm_json(raw)
        assert result["files"] == []

    def test_invalid_letter_escape(self):
        # Le LLM génère \s dans une string JSON (invalide) — doit être corrigé en \\s
        raw = r'{"content": "var re = /\s+/g;"}'
        result = _parse_llm_json(raw)
        assert "content" in result

    def test_invalid_digit_escape(self):
        # \1 (backreference JS) est invalide en JSON — doit être corrigé en \\1
        raw = r'{"content": "/(\d)\1/"}'
        result = _parse_llm_json(raw)
        assert "content" in result

    def test_multiple_invalid_escapes_iterative(self):
        # Plusieurs escapes invalides résiduels — la correction itérative les traite un par un
        raw = r'{"content": "a\qb\zc"}'
        result = _parse_llm_json(raw)
        assert "content" in result

    def test_no_json_raises(self):
        with pytest.raises(ValueError, match="LLM did not return valid JSON"):
            _parse_llm_json("no json here")
