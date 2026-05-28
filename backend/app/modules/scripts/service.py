from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.script import Script

from .ai import ai_modify_script
from .crud import (
    add_version,
    create_script,
    delete_script,
    get_script,
    list_scripts,
    update_script,
)
from .gas import pull_from_gas, push_to_gas
from .schemas import ScriptCreate, ScriptFileIn, ScriptUpdate


async def create_script_and_fetch(data: ScriptCreate, owner_email: str, db: AsyncSession) -> Script:
    script = await create_script(data, owner_email, db)
    return await get_script(script.id, db)


async def get_script_or_none(script_id: int, db: AsyncSession) -> Script | None:
    return await get_script(script_id, db)


async def list_all_scripts(db: AsyncSession) -> list[dict]:
    return await list_scripts(db)


async def update_script_fields(
    script_id: int, data: ScriptUpdate, db: AsyncSession
) -> Script | None:
    return await update_script(script_id, data, db)


async def delete_script_by_id(script_id: int, db: AsyncSession) -> bool:
    return await delete_script(script_id, db)


async def add_version_to_script(
    script_id: int, files: list[ScriptFileIn], message: str, owner_email: str, db: AsyncSession
) -> Script | None:
    return await add_version(script_id, files, message, owner_email, db)


async def apply_ai_modification(
    script_id: int,
    prompt: str,
    db: AsyncSession,
    google_access_token: str | None = None,
    history: list | None = None,
) -> dict:
    return await ai_modify_script(script_id, prompt, db, google_access_token, history)


async def sync_pull(script_id: int, access_token: str, email: str, db: AsyncSession) -> object:
    return await pull_from_gas(script_id, access_token, email, db)


async def sync_push(script_id: int, access_token: str, db: AsyncSession) -> None:
    return await push_to_gas(script_id, access_token, db)
