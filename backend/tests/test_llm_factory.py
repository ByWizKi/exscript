from __future__ import annotations

import pytest

from app.llm.anthropic_provider import AnthropicProvider
from app.llm.factory import get_provider
from app.llm.gemini_provider import GeminiProvider
from app.llm.openai_provider import OpenAIProvider


def test_get_provider_openai():
    provider = get_provider("openai", "gpt-4", "test_key")
    assert isinstance(provider, OpenAIProvider)


def test_get_provider_openai_lowercase():
    provider = get_provider("OpenAI", "gpt-4", "test_key")
    assert isinstance(provider, OpenAIProvider)


def test_get_provider_anthropic():
    provider = get_provider("anthropic", "claude-3-opus", "test_key")
    assert isinstance(provider, AnthropicProvider)


def test_get_provider_anthropic_lowercase():
    provider = get_provider("ANTHROPIC", "claude-3", "test_key")
    assert isinstance(provider, AnthropicProvider)


def test_get_provider_gemini():
    provider = get_provider("gemini", "gemini-pro", "test_key")
    assert isinstance(provider, GeminiProvider)


def test_get_provider_gemini_lowercase():
    provider = get_provider("GeMiNi", "gemini-pro", "test_key")
    assert isinstance(provider, GeminiProvider)


def test_get_provider_ollama_default_url():
    provider = get_provider("ollama", "mistral", "test_key")
    assert isinstance(provider, OpenAIProvider)


def test_get_provider_ollama_custom_url():
    provider = get_provider("ollama", "mistral", "test_key", base_url="http://custom:8000/v1")
    assert isinstance(provider, OpenAIProvider)


def test_get_provider_unknown():
    with pytest.raises(ValueError, match="Unknown LLM provider"):
        get_provider("unknown_provider", "model", "key")


def test_get_provider_unknown_case_insensitive():
    with pytest.raises(ValueError, match="Unknown LLM provider"):
        get_provider("UNKNOWN", "model", "key")


def test_get_provider_supported_list():
    with pytest.raises(ValueError, match="Supported: openai, anthropic, gemini, ollama"):
        get_provider("invalid", "model", "key")
