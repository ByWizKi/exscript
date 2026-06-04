from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.script import ChatMessage as ChatMessageModel
from app.db.models.script import Script, ScriptFile, ScriptVersion

from .schemas import ScriptCreate, ScriptUpdate


async def create_script(data: ScriptCreate, owner_email: str, db: AsyncSession) -> Script:
    script = Script(
        name=data.name,
        gas_script_id=data.gas_script_id,
        spreadsheet_id=data.spreadsheet_id,
        owner_email=owner_email,
    )
    db.add(script)
    await db.flush()

    version = ScriptVersion(
        script_id=script.id,
        version_number=1,
        message=data.version_message,
        created_by=owner_email,
    )
    db.add(version)
    await db.flush()

    for f in data.files:
        db.add(
            ScriptFile(
                version_id=version.id,
                filename=f.filename,
                content=f.content,
                file_type=f.file_type,
            )
        )

    await db.commit()
    await db.refresh(script)
    return script


async def list_scripts(db: AsyncSession, owner_email: str) -> list[dict]:
    result = await db.execute(
        select(Script, func.count(ScriptVersion.id).label("version_count"))
        .where(Script.owner_email == owner_email)
        .outerjoin(ScriptVersion, ScriptVersion.script_id == Script.id)
        .group_by(Script.id)
        .order_by(Script.created_at.desc())
    )
    rows = result.all()

    scripts = []
    for row in rows:
        script = row[0]
        version_count = row[1]
        latest = await db.execute(
            select(ScriptVersion)
            .where(ScriptVersion.script_id == script.id)
            .order_by(ScriptVersion.version_number.desc())
            .limit(1)
        )
        latest_version = latest.scalar_one_or_none()
        scripts.append(
            {
                "id": script.id,
                "name": script.name,
                "gas_script_id": script.gas_script_id,
                "spreadsheet_id": script.spreadsheet_id,
                "owner_email": script.owner_email,
                "created_at": script.created_at,
                "version_count": version_count,
                "latest_status": latest_version.status.value if latest_version else None,
            }
        )
    return scripts


async def get_script(script_id: int, db: AsyncSession) -> Script | None:
    result = await db.execute(
        select(Script)
        .where(Script.id == script_id)
        .options(selectinload(Script.versions).selectinload(ScriptVersion.files))
    )
    return result.scalar_one_or_none()


async def get_version(version_id: int, db: AsyncSession) -> ScriptVersion | None:
    result = await db.execute(
        select(ScriptVersion)
        .where(ScriptVersion.id == version_id)
        .options(selectinload(ScriptVersion.files))
    )
    return result.scalar_one_or_none()


async def add_version(
    script_id: int,
    files: list,
    message: str,
    owner_email: str,
    db: AsyncSession,
) -> Script | None:
    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    next_number = (script.latest_version.version_number if script.latest_version else 0) + 1

    version = ScriptVersion(
        script_id=script_id,
        version_number=next_number,
        message=message,
        created_by=owner_email,
    )
    db.add(version)
    await db.flush()

    for f in files:
        db.add(
            ScriptFile(
                version_id=version.id,
                filename=f.filename,
                content=f.content,
                file_type=f.file_type,
            )
        )

    await db.commit()
    return await get_script(script_id, db)


async def update_script(script_id: int, data: ScriptUpdate, db: AsyncSession) -> Script | None:
    script = await db.get(Script, script_id)
    if not script:
        return None
    if data.name is not None:
        script.name = data.name
    if data.gas_script_id is not None:
        script.gas_script_id = data.gas_script_id
    if data.spreadsheet_id is not None:
        script.spreadsheet_id = data.spreadsheet_id
    await db.commit()
    return await get_script(script_id, db)


async def delete_script(script_id: int, db: AsyncSession) -> bool:
    script = await db.get(Script, script_id)
    if not script:
        return False
    await db.delete(script)
    await db.commit()
    return True


async def save_chat_message(
    script_id: int,
    role: str,
    content: str,
    message_type: str,
    db: AsyncSession,
    metadata_json: dict | None = None,
) -> ChatMessageModel:
    msg = ChatMessageModel(
        script_id=script_id,
        role=role,
        content=content,
        message_type=message_type,
        metadata_json=metadata_json,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_chat_history(script_id: int, db: AsyncSession) -> list[ChatMessageModel]:
    result = await db.execute(
        select(ChatMessageModel)
        .where(ChatMessageModel.script_id == script_id)
        .order_by(ChatMessageModel.created_at)
    )
    return list(result.scalars().all())


async def clear_chat_history(script_id: int, db: AsyncSession) -> None:
    msgs = await db.execute(select(ChatMessageModel).where(ChatMessageModel.script_id == script_id))
    for msg in msgs.scalars().all():
        await db.delete(msg)
    await db.commit()
