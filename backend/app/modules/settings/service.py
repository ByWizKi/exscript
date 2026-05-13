from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.setting import Setting
from .schemas import LLMSettingsIn, LLMSettingsOut


async def _get(db: AsyncSession, key: str) -> str:
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    return row.value if row else ""


async def _set(db: AsyncSession, key: str, value: str) -> None:
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))


async def get_llm_settings(db: AsyncSession) -> LLMSettingsOut:
    provider = await _get(db, "llm_provider") or "openai"
    model = await _get(db, "llm_model") or "gpt-4o"
    api_key = await _get(db, "llm_api_key")
    base_url = await _get(db, "llm_base_url")
    return LLMSettingsOut(
        provider=provider,
        model=model,
        api_key_set=bool(api_key),
        base_url=base_url,
    )


async def save_llm_settings(data: LLMSettingsIn, db: AsyncSession) -> LLMSettingsOut:
    await _set(db, "llm_provider", data.provider)
    await _set(db, "llm_model", data.model)
    if data.api_key:
        await _set(db, "llm_api_key", data.api_key)
    await _set(db, "llm_base_url", data.base_url)
    await db.commit()
    return await get_llm_settings(db)


async def get_provider_instance(db: AsyncSession):
    from app.llm.factory import get_provider
    provider = await _get(db, "llm_provider") or "openai"
    model = await _get(db, "llm_model") or "gpt-4o"
    api_key = await _get(db, "llm_api_key")
    base_url = await _get(db, "llm_base_url") or None
    if not api_key and provider != "ollama":
        raise ValueError("LLM API key not configured. Go to Settings to configure it.")
    return get_provider(name=provider, model=model, api_key=api_key, base_url=base_url)
