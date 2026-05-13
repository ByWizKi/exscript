from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .schemas import LLMSettingsIn, LLMSettingsOut
from .service import get_llm_settings, save_llm_settings

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def _require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = decode_access_token(credentials.credentials)
    return payload["sub"]


@router.get("/llm", response_model=LLMSettingsOut)
async def get_llm(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(_require_auth),
):
    return await get_llm_settings(db)


@router.put("/llm", response_model=LLMSettingsOut)
async def update_llm(
    body: LLMSettingsIn,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(_require_auth),
):
    return await save_llm_settings(body, db)
