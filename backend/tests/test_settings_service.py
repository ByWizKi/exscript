from __future__ import annotations

import pytest

from app.modules.settings.schemas import LLMSettingsIn
from app.modules.settings.service import (
    get_llm_settings,
    get_provider_instance,
    save_llm_settings,
)


@pytest.mark.asyncio
async def test_get_llm_settings_has_defaults(db):
    # Test that settings provide defaults
    result = await get_llm_settings(db)
    assert result is not None
    # Should have provider and model defaults
    assert result.provider is not None
    assert result.model is not None


@pytest.mark.asyncio
async def test_save_llm_settings_new(db):
    # Test creating new LLM settings
    settings_in = LLMSettingsIn(
        provider="anthropic",
        model="claude-3-opus",
        api_key="sk-test123",
        base_url="",
    )
    result = await save_llm_settings(settings_in, db)
    assert result.provider == "anthropic"
    assert result.model == "claude-3-opus"
    # API key was provided, so api_key_set should be True
    assert result.api_key_set is True


@pytest.mark.asyncio
async def test_save_llm_settings_updates_existing(db):
    # Test updating settings
    settings_in1 = LLMSettingsIn(
        provider="openai",
        model="gpt-4",
        api_key="sk-first",
        base_url="",
    )
    await save_llm_settings(settings_in1, db)

    # Update with different values
    settings_in2 = LLMSettingsIn(
        provider="gemini",
        model="gemini-pro",
        api_key="sk-second",
        base_url="",
    )
    result = await save_llm_settings(settings_in2, db)
    assert result.provider == "gemini"
    assert result.model == "gemini-pro"


@pytest.mark.asyncio
async def test_save_llm_settings_with_base_url(db):
    # Test saving settings with custom base URL (for Ollama)
    settings_in = LLMSettingsIn(
        provider="ollama",
        model="mistral",
        api_key="",
        base_url="http://localhost:11434/v1",
    )
    result = await save_llm_settings(settings_in, db)
    assert result.provider == "ollama"
    assert result.model == "mistral"
    assert result.base_url == "http://localhost:11434/v1"


@pytest.mark.asyncio
async def test_save_then_get_llm_settings(db):
    # Test full roundtrip: save then retrieve
    settings_in = LLMSettingsIn(
        provider="gemini",
        model="gemini-pro-vision",
        api_key="sk-gemini-test123",
        base_url="",
    )
    await save_llm_settings(settings_in, db)

    # Now retrieve
    result = await get_llm_settings(db)
    assert result.provider == "gemini"
    assert result.model == "gemini-pro-vision"


@pytest.mark.asyncio
async def test_get_provider_instance_ollama(db):
    # Test that Ollama provider can be instantiated
    settings_in = LLMSettingsIn(
        provider="ollama",
        model="mistral",
        api_key="",
        base_url="http://localhost:11434/v1",
    )
    await save_llm_settings(settings_in, db)

    # Should not raise even without API key for ollama
    provider = await get_provider_instance(db)
    assert provider is not None


@pytest.mark.asyncio
async def test_get_provider_instance_with_api_key(db):
    # Test getting provider instance with a valid API key
    settings_in = LLMSettingsIn(
        provider="openai",
        model="gpt-4-turbo",
        api_key="sk-testkey12345",
        base_url="",
    )
    await save_llm_settings(settings_in, db)

    # Should successfully get provider instance
    provider = await get_provider_instance(db)
    assert provider is not None
