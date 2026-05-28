from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from .crud import get_setting, set_setting
from .schemas import LLMSettingsIn, LLMSettingsOut

_DEFAULT_MODEL = "gemini-2.5-flash"


async def get_llm_settings(db: AsyncSession) -> LLMSettingsOut:
    model = await get_setting(db, "llm_model") or _DEFAULT_MODEL
    return LLMSettingsOut(model=model)


async def save_llm_settings(data: LLMSettingsIn, db: AsyncSession) -> LLMSettingsOut:
    await set_setting(db, "llm_model", data.model)
    await db.commit()
    return await get_llm_settings(db)


async def get_provider_instance(db: AsyncSession):
    from app.llm.factory import get_provider

    model = await get_setting(db, "llm_model") or _DEFAULT_MODEL
    return get_provider(name="vertex", model=model, api_key="")
