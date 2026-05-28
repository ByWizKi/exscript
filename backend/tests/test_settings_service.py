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
    result = await get_llm_settings(db)
    assert result is not None
    assert result.model is not None


@pytest.mark.asyncio
async def test_save_llm_settings_new(db):
    settings_in = LLMSettingsIn(model="gemini-2.0-pro")
    result = await save_llm_settings(settings_in, db)
    assert result.model == "gemini-2.0-pro"


@pytest.mark.asyncio
async def test_save_llm_settings_updates_existing(db):
    await save_llm_settings(LLMSettingsIn(model="gemini-1.5-pro"), db)
    result = await save_llm_settings(LLMSettingsIn(model="gemini-2.0-flash"), db)
    assert result.model == "gemini-2.0-flash"


@pytest.mark.asyncio
async def test_save_then_get_llm_settings(db):
    await save_llm_settings(LLMSettingsIn(model="gemini-2.0-pro"), db)
    result = await get_llm_settings(db)
    assert result.model == "gemini-2.0-pro"


@pytest.mark.asyncio
async def test_get_provider_instance_returns_vertex(db):
    provider = await get_provider_instance(db)
    assert provider is not None
    from app.llm.vertex_provider import VertexProvider

    assert isinstance(provider, VertexProvider)


@pytest.mark.asyncio
async def test_get_provider_instance_uses_saved_model(db):
    await save_llm_settings(LLMSettingsIn(model="gemini-2.0-flash-lite"), db)
    provider = await get_provider_instance(db)
    assert provider is not None
    assert provider._model == "gemini-2.0-flash-lite"
