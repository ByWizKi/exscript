from __future__ import annotations

from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.llm.anthropic_provider import AnthropicProvider
from app.llm.base import LLMMessage
from app.llm.gemini_provider import GeminiProvider
from app.llm.openai_provider import OpenAIProvider


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


class TestGeminiProvider:
    @patch("app.llm.gemini_provider.genai")
    def test_init(self, mock_genai):
        mock_genai.GenerativeModel = Mock(return_value=Mock())
        provider = GeminiProvider(api_key="test_key", model="gemini-pro")

        mock_genai.configure.assert_called_once_with(api_key="test_key")
        assert provider._model is not None

    @patch("app.llm.gemini_provider.genai")
    @pytest.mark.asyncio
    async def test_complete_with_system_and_user(self, mock_genai):
        mock_model = AsyncMock()
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = Mock(return_value=Mock())

        provider = GeminiProvider(api_key="test_key", model="gemini-pro")
        provider._model = mock_model

        mock_response = Mock()
        mock_response.text = "Gemini response"
        mock_model.generate_content_async.return_value = mock_response

        messages = [
            LLMMessage(role="system", content="You are helpful"),
            LLMMessage(role="user", content="Hello"),
        ]

        result = await provider.complete(messages)

        assert result == "Gemini response"
        mock_model.generate_content_async.assert_called_once()
        call_args = mock_model.generate_content_async.call_args
        prompt = call_args[0][0]
        assert "[System Instructions]" in prompt
        assert "You are helpful" in prompt
        assert "[User]" in prompt
        assert "Hello" in prompt
