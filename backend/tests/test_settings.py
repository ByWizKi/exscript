from __future__ import annotations

import pytest

from app.modules.settings.schemas import LLMSettingsIn
from app.modules.settings.service import get_llm_settings, save_llm_settings


@pytest.mark.asyncio
async def test_get_settings_returns_defaults(db):
    settings = await get_llm_settings(db)
    assert settings is not None
    assert settings.model is not None


@pytest.mark.asyncio
async def test_set_and_get_settings(db):
    data = LLMSettingsIn(model="gemini-2.0-pro")
    await save_llm_settings(data, db)
    result = await get_llm_settings(db)
    assert result.model == "gemini-2.0-pro"


@pytest.mark.asyncio
async def test_settings_no_api_key_exposed(db):
    result = await get_llm_settings(db)
    assert not hasattr(result, "api_key")
    assert not hasattr(result, "provider")
