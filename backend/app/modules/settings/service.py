from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import decrypt, encrypt

from .crud import get_setting, set_setting
from .schemas import LLMSettingsIn, LLMSettingsOut


async def get_llm_settings(db: AsyncSession) -> LLMSettingsOut:
    provider = await get_setting(db, "llm_provider") or "openai"
    model = await get_setting(db, "llm_model") or "gpt-4o"
    raw_api_key = await get_setting(db, "llm_api_key")
    base_url = await get_setting(db, "llm_base_url")
    return LLMSettingsOut(
        provider=provider,
        model=model,
        api_key_set=bool(raw_api_key),
        base_url=base_url,
    )


async def save_llm_settings(data: LLMSettingsIn, db: AsyncSession) -> LLMSettingsOut:
    await set_setting(db, "llm_provider", data.provider)
    await set_setting(db, "llm_model", data.model)
    if data.api_key:
        await set_setting(db, "llm_api_key", encrypt(data.api_key))
    await set_setting(db, "llm_base_url", data.base_url)
    await db.commit()
    return await get_llm_settings(db)


async def get_provider_instance(db: AsyncSession):
    from app.llm.factory import get_provider

    provider = await get_setting(db, "llm_provider") or "openai"
    model = await get_setting(db, "llm_model") or "gpt-4o"
    raw_api_key = await get_setting(db, "llm_api_key")
    decrypted_key = decrypt(raw_api_key) if raw_api_key else ""
    base_url = await get_setting(db, "llm_base_url") or None
    if not decrypted_key and provider != "ollama":
        raise ValueError("LLM API key not configured. Go to Settings to configure it.")
    return get_provider(name=provider, model=model, api_key=decrypted_key, base_url=base_url)
