from __future__ import annotations

import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_email
from app.db.session import get_db

from .schemas import (
    AIClarifyRequest,
    AIClarifyResponse,
    AIModifyRequest,
    AIModifyResponse,
    PushRequest,
    ScriptCreate,
    ScriptFileIn,
    ScriptListItem,
    ScriptOut,
    ScriptUpdate,
    VersionCreate,
)
from .service import (
    add_version_to_script,
    apply_ai_modification,
    clarify_ai_modification,
    create_script_and_fetch,
    delete_script_by_id,
    get_script_or_none,
    list_all_scripts,
    preview_pull,
    restore_version,
    sync_pull,
    sync_push,
    update_script_fields,
)

router = APIRouter()


@router.get("", response_model=list[ScriptListItem])
async def list_scripts_endpoint(
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    return await list_all_scripts(db, email)


@router.post("", response_model=ScriptOut, status_code=201)
async def create_script_endpoint(
    body: ScriptCreate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    return await create_script_and_fetch(body, email, db)


@router.get("/{script_id}", response_model=ScriptOut)
async def get_script_endpoint(
    script_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    script = await get_script_or_none(script_id, db)
    if not script:
        raise HTTPException(status_code=404, detail="Script non trouvé")
    return script


@router.put("/{script_id}", response_model=ScriptOut)
async def update_script_endpoint(
    script_id: int,
    body: ScriptUpdate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    script = await update_script_fields(script_id, body, db)
    if not script:
        raise HTTPException(status_code=404, detail="Script non trouvé")
    return script


@router.delete("/{script_id}", status_code=204)
async def delete_script_endpoint(
    script_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    deleted = await delete_script_by_id(script_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Script non trouvé")


@router.post("/{script_id}/ai-clarify", response_model=AIClarifyResponse)
async def ai_clarify_endpoint(
    script_id: int,
    body: AIClarifyRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    try:
        result = await clarify_ai_modification(
            script_id, body.prompt, db, body.google_access_token, body.history or None
        )
        logging.getLogger(__name__).info(
            "ai-clarify result type=%s feasible=%s", result.get("type"), result.get("feasible")
        )
        return result
    except ValueError as err:
        logging.getLogger(__name__).error("ai-clarify ValueError: %s", err)
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        logging.getLogger(__name__).error("ai-clarify error: %s\n%s", err, traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(err)) from err


@router.post("/{script_id}/ai-modify", response_model=AIModifyResponse)
async def ai_modify_endpoint(
    script_id: int,
    body: AIModifyRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    try:
        base_files = [f.model_dump() for f in body.base_files] if body.base_files else None
        return await apply_ai_modification(
            script_id, body.prompt, db, body.google_access_token, body.history, base_files
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        logging.getLogger(__name__).error("ai-modify error: %s\n%s", err, traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(err)) from err


@router.post("/{script_id}/pull-preview", response_model=list[ScriptFileIn])
async def pull_preview_endpoint(
    script_id: int,
    body: PushRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    try:
        return await preview_pull(script_id, body.access_token, db)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=502, detail=str(err)) from err


@router.post("/{script_id}/pull", response_model=ScriptOut)
async def pull_from_gas_endpoint(
    script_id: int,
    body: PushRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    try:
        return await sync_pull(script_id, body.access_token, email, db)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=502, detail=str(err)) from err


@router.post("/{script_id}/push")
async def push_to_gas_endpoint(
    script_id: int,
    body: PushRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    _: str = Depends(get_current_email),
):
    try:
        await sync_push(script_id, body.access_token, db)
        return {"success": True}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=502, detail=str(err)) from err


@router.post("/{script_id}/restore/{version_id}", response_model=ScriptOut, status_code=201)
async def restore_version_endpoint(
    script_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    try:
        return await restore_version(script_id, version_id, email, db)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err


@router.post("/{script_id}/versions", response_model=ScriptOut, status_code=201)
async def add_version_endpoint(
    script_id: int,
    body: VersionCreate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    try:
        return await add_version_to_script(script_id, body.files, body.message, email, db)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
