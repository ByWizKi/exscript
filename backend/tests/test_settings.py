from __future__ import annotations

import pytest

from app.modules.settings.schemas import LLMSettingsIn
from app.modules.settings.service import get_llm_settings, save_llm_settings


@pytest.mark.asyncio
async def test_get_settings_returns_defaults(db):
    settings = await get_llm_settings(db)
    assert settings is not None
    assert hasattr(settings, "provider")
    assert settings.provider is not None


@pytest.mark.asyncio
async def test_set_and_get_settings(db):
    data = LLMSettingsIn(
        provider="anthropic",
        model="claude-3-haiku-20240307",
        api_key="test-key-123",
    )
    await save_llm_settings(data, db)
    result = await get_llm_settings(db)
    assert result.provider == "anthropic"
    assert result.model == "claude-3-haiku-20240307"
    assert result.api_key_set is True


@pytest.mark.asyncio
async def test_api_key_not_returned_in_output(db):
    data = LLMSettingsIn(
        provider="openai",
        model="gpt-4o",
        api_key="secret-key-should-not-leak",
    )
    await save_llm_settings(data, db)
    result = await get_llm_settings(db)
    # api_key should not be in the output, only api_key_set
    assert not hasattr(result, "api_key") or result.api_key is None
    assert result.api_key_set is True
