from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_email
from app.db.session import get_db

from .schemas import LLMSettingsIn, LLMSettingsOut
from .service import get_llm_settings, save_llm_settings

router = APIRouter()


@router.get("/llm", response_model=LLMSettingsOut)
async def get_llm(
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    return await get_llm_settings(db)


@router.put("/llm", response_model=LLMSettingsOut)
async def update_llm(
    body: LLMSettingsIn,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    return await save_llm_settings(body, db)
