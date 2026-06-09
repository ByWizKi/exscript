from __future__ import annotations

from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.llm.anthropic_provider import AnthropicProvider
from app.llm.base import LLMMessage
from app.llm.gemini_provider import GeminiProvider
from app.llm.openai_provider import OpenAIProvider
from app.llm.vertex_provider import VertexProvider


class TestAnthropicProvider:
    def test_init(self):
        provider = AnthropicProvider(api_key="test_key", model="claude-3-opus")
        assert provider._model == "claude-3-opus"
        assert provider._client is not None

    @pytest.mark.asyncio
    async def test_complete_with_system_message(self):
        provider = AnthropicProvider(api_key="test_key", model="claude-3-opus")

        # Mock the async client
        with patch.object(
            provider._client.messages, "create", new_callable=AsyncMock
        ) as mock_create:
            # Create a mock response
            mock_response = Mock()
            mock_response.content = [Mock(text="Generated response")]
            mock_create.return_value = mock_response

            messages = [
                LLMMessage(role="system", content="You are helpful"),
                LLMMessage(role="user", content="Hello"),
            ]

            result = await provider.complete(messages)

            assert result == "Generated response"
            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["model"] == "claude-3-opus"
            assert call_kwargs["system"] == "You are helpful"
            assert len(call_kwargs["messages"]) == 1

    @pytest.mark.asyncio
    async def test_complete_without_system_message(self):
        provider = AnthropicProvider(api_key="test_key", model="claude-3-opus")

        with patch.object(
            provider._client.messages, "create", new_callable=AsyncMock
        ) as mock_create:
            mock_response = Mock()
            mock_response.content = [Mock(text="Response without system")]
            mock_create.return_value = mock_response

            messages = [
                LLMMessage(role="user", content="Hello"),
                LLMMessage(role="assistant", content="Hi there"),
            ]

            result = await provider.complete(messages)

            assert result == "Response without system"
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["system"] == ""


class TestOpenAIProvider:
    def test_init_without_base_url(self):
        provider = OpenAIProvider(api_key="test_key", model="gpt-4")
        assert provider._model == "gpt-4"
        assert provider._client is not None

    def test_init_with_base_url(self):
        provider = OpenAIProvider(
            api_key="test_key", model="gpt-4", base_url="http://localhost:8000/v1"
        )
        assert provider._model == "gpt-4"

    @pytest.mark.asyncio
    async def test_complete_with_messages(self):
        provider = OpenAIProvider(api_key="test_key", model="gpt-4")

        with patch.object(
            provider._client.chat.completions, "create", new_callable=AsyncMock
        ) as mock_create:
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="OpenAI response"))]
            mock_create.return_value = mock_response

            messages = [
                LLMMessage(role="system", content="You are helpful"),
                LLMMessage(role="user", content="Hello"),
            ]

            result = await provider.complete(messages)

            assert result == "OpenAI response"
            mock_create.assert_called_once()

    @pytest.mark.asyncio
    async def test_complete_with_null_content(self):
        provider = OpenAIProvider(api_key="test_key", model="gpt-4")

        with patch.object(
            provider._client.chat.completions, "create", new_callable=AsyncMock
        ) as mock_create:
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content=None))]
            mock_create.return_value = mock_response

            messages = [LLMMessage(role="user", content="Hello")]

            result = await provider.complete(messages)

            assert result == ""


class TestVertexProviderStream:
    @patch("app.llm.vertex_provider.genai")
    @patch("app.llm.vertex_provider.settings")
    @pytest.mark.asyncio
    async def test_complete_stream_yields_chunks(self, mock_settings, mock_genai):
        mock_settings.vertex_project_id = "test-project"
        mock_settings.vertex_location = "europe-west1"

        mock_client = AsyncMock()
        mock_genai.Client.return_value = mock_client

        async def fake_stream(*args, **kwargs):
            for text in ["chunk1", "chunk2", "chunk3"]:
                chunk = Mock()
                chunk.text = text
                yield chunk

        mock_client.aio.models.generate_content_stream = fake_stream

        provider = VertexProvider(model="gemini-2.5-pro")
        messages = [
            LLMMessage(role="system", content="You are helpful"),
            LLMMessage(role="user", content="Hello"),
        ]

        chunks = []
        async for chunk in provider.complete_stream(messages):
            chunks.append(chunk)

        assert chunks == ["chunk1", "chunk2", "chunk3"]

    @patch("app.llm.vertex_provider.genai")
    @patch("app.llm.vertex_provider.settings")
    @pytest.mark.asyncio
    async def test_complete_stream_skips_empty_chunks(self, mock_settings, mock_genai):
        mock_settings.vertex_project_id = "test-project"
        mock_settings.vertex_location = "europe-west1"

        mock_client = AsyncMock()
        mock_genai.Client.return_value = mock_client

        async def fake_stream(*args, **kwargs):
            for text in ["hello", "", None, " ", "world"]:
                chunk = Mock()
                chunk.text = text
                yield chunk

        mock_client.aio.models.generate_content_stream = fake_stream

        provider = VertexProvider(model="gemini-2.5-pro")
        messages = [LLMMessage(role="user", content="Hi")]

        chunks = []
        async for chunk in provider.complete_stream(messages):
            chunks.append(chunk)

        assert chunks == ["hello", " ", "world"]

    @patch("app.llm.vertex_provider.genai")
    @patch("app.llm.vertex_provider.settings")
    @pytest.mark.asyncio
    async def test_complete_uses_stream_internally(self, mock_settings, mock_genai):
        """complete() doit assembler les chunks de complete_stream()."""
        mock_settings.vertex_project_id = "test-project"
        mock_settings.vertex_location = "europe-west1"

        mock_client = AsyncMock()
        mock_genai.Client.return_value = mock_client

        async def fake_stream(*args, **kwargs):
            for text in ["part1", " ", "part2"]:
                chunk = Mock()
                chunk.text = text
                yield chunk

        mock_client.aio.models.generate_content_stream = fake_stream

        provider = VertexProvider(model="gemini-2.5-pro")
        messages = [LLMMessage(role="user", content="Hello")]

        result = await provider.complete(messages)
        assert result == "part1 part2"

    @patch("app.llm.vertex_provider.genai")
    @patch("app.llm.vertex_provider.settings")
    @pytest.mark.asyncio
    async def test_complete_stream_propagates_error(self, mock_settings, mock_genai):
        mock_settings.vertex_project_id = "test-project"
        mock_settings.vertex_location = "europe-west1"

        mock_client = AsyncMock()
        mock_genai.Client.return_value = mock_client

        async def fake_stream_error(*args, **kwargs):
            yield Mock(text="first chunk")
            raise RuntimeError("network error mid-stream")

        mock_client.aio.models.generate_content_stream = fake_stream_error

        provider = VertexProvider(model="gemini-2.5-pro")
        messages = [LLMMessage(role="user", content="Hello")]

        with pytest.raises(RuntimeError, match="network error mid-stream"):
            async for _ in provider.complete_stream(messages):
                pass


class TestLLMProviderFallbackStream:
    """Les providers non-Vertex doivent streamer via complete() en fallback."""

    @pytest.mark.asyncio
    async def test_anthropic_complete_stream_fallback(self):
        provider = AnthropicProvider(api_key="test", model="claude-3-opus")
        with patch.object(provider, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = "full response"
            chunks = []
            async for chunk in provider.complete_stream([LLMMessage(role="user", content="hi")]):
                chunks.append(chunk)
            assert chunks == ["full response"]

    @patch("app.llm.gemini_provider.genai")
    @pytest.mark.asyncio
    async def test_gemini_complete_stream_fallback(self, mock_genai):
        mock_genai.Client.return_value = Mock()
        provider = GeminiProvider(api_key="test", model="gemini-pro")
        with patch.object(provider, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = "gemini full response"
            chunks = []
            async for chunk in provider.complete_stream([LLMMessage(role="user", content="hi")]):
                chunks.append(chunk)
            assert chunks == ["gemini full response"]


class TestGeminiProvider:
    @patch("app.llm.gemini_provider.genai")
    def test_init(self, mock_genai):
        mock_genai.Client.return_value = Mock()
        provider = GeminiProvider(api_key="test_key", model="gemini-pro")

        mock_genai.Client.assert_called_once_with(api_key="test_key")
        assert provider._model == "gemini-pro"

    @patch("app.llm.gemini_provider.genai")
    @pytest.mark.asyncio
    async def test_complete_with_system_and_user(self, mock_genai):
        mock_client = AsyncMock()
        mock_genai.Client.return_value = mock_client

        mock_response = Mock()
        mock_response.text = "Gemini response"
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        provider = GeminiProvider(api_key="test_key", model="gemini-pro")

        messages = [
            LLMMessage(role="system", content="You are helpful"),
            LLMMessage(role="user", content="Hello"),
        ]

        result = await provider.complete(messages)

        assert result == "Gemini response"
        mock_client.aio.models.generate_content.assert_called_once()
