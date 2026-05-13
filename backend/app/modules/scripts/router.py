from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .schemas import ScriptCreate, ScriptOut, ScriptListItem, AIModifyRequest, AIModifyResponse, VersionCreate
from .service import create_script, list_scripts, get_script, ai_modify_script, add_version

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def get_current_email(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = decode_access_token(credentials.credentials)
    return payload["sub"]


@router.get("", response_model=list[ScriptListItem])
async def list_scripts_endpoint(
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    return await list_scripts(db)


@router.post("", response_model=ScriptOut, status_code=201)
async def create_script_endpoint(
    body: ScriptCreate,
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    script = await create_script(body, email, db)
    return await get_script(script.id, db)


@router.get("/{script_id}", response_model=ScriptOut)
async def get_script_endpoint(
    script_id: int,
    db: AsyncSession = Depends(get_db),
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
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    try:
        result = await ai_modify_script(script_id, body.prompt, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{script_id}/versions", response_model=ScriptOut, status_code=201)
async def add_version_endpoint(
    script_id: int,
    body: VersionCreate,
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    try:
        script = await add_version(script_id, body.files, body.message, email, db)
        return script
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
