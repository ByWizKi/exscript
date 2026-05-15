from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db

from .schemas import (
    AIModifyRequest,
    AIModifyResponse,
    PushRequest,
    ScriptCreate,
    ScriptListItem,
    ScriptOut,
    VersionCreate,
)
from .service import (
    add_version,
    ai_modify_script,
    create_script,
    get_script,
    list_scripts,
    push_to_gas,
)

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def get_current_email(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),  # noqa: B008
) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = decode_access_token(credentials.credentials)
    return payload["sub"]


@router.get("", response_model=list[ScriptListItem])
async def list_scripts_endpoint(
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    return await list_scripts(db)


@router.post("", response_model=ScriptOut, status_code=201)
async def create_script_endpoint(
    body: ScriptCreate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    script = await create_script(body, email, db)
    return await get_script(script.id, db)


@router.get("/{script_id}", response_model=ScriptOut)
async def get_script_endpoint(
    script_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    script = await get_script(script_id, db)
    if not script:
        raise HTTPException(status_code=404, detail="Script non trouvé")
    return script


@router.post("/{script_id}/ai-modify", response_model=AIModifyResponse)
async def ai_modify_endpoint(
    script_id: int,
    body: AIModifyRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    try:
        result = await ai_modify_script(
            script_id, body.prompt, db, body.google_access_token, body.history
        )
        return result
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err


@router.post("/{script_id}/push")
async def push_to_gas_endpoint(
    script_id: int,
    body: PushRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    try:
        await push_to_gas(script_id, body.access_token, db)
        return {"success": True}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=502, detail=str(err)) from err


@router.post("/{script_id}/versions", response_model=ScriptOut, status_code=201)
async def add_version_endpoint(
    script_id: int,
    body: VersionCreate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
    email: str = Depends(get_current_email),
):
    try:
        script = await add_version(script_id, body.files, body.message, email, db)
        return script
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
