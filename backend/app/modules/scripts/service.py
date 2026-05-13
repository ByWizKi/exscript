from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.db.models.script import Script, ScriptVersion, ScriptFile
from .schemas import ScriptCreate


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
        db.add(ScriptFile(
            version_id=version.id,
            filename=f.filename,
            content=f.content,
            file_type=f.file_type,
        ))

    await db.commit()
    await db.refresh(script)
    return script


async def list_scripts(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Script, func.count(ScriptVersion.id).label("version_count"))
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
        scripts.append({
            "id": script.id,
            "name": script.name,
            "gas_script_id": script.gas_script_id,
            "spreadsheet_id": script.spreadsheet_id,
            "owner_email": script.owner_email,
            "created_at": script.created_at,
            "version_count": version_count,
            "latest_status": latest_version.status.value if latest_version else None,
        })
    return scripts


async def get_script(script_id: int, db: AsyncSession) -> Script | None:
    result = await db.execute(
        select(Script)
        .where(Script.id == script_id)
        .options(selectinload(Script.versions).selectinload(ScriptVersion.files))
    )
    script = result.scalar_one_or_none()
    if script and script.versions:
        script.versions = [max(script.versions, key=lambda v: v.version_number)]
    return script


import json
import re


async def ai_modify_script(
    script_id: int,
    prompt: str,
    db: AsyncSession,
) -> dict:
    from app.modules.settings.service import get_provider_instance
    from app.llm.base import LLMMessage

    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    latest = script.versions[0] if script.versions else None
    if not latest or not latest.files:
        raise ValueError("No files found in the latest version")

    files_context = "\n\n".join(
        f"### {f.filename}\n```javascript\n{f.content}\n```"
        for f in latest.files
    )

    system_prompt = (
        "You are a Google Apps Script expert. "
        "The user will describe a modification to make to their GAS project. "
        "You must return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:\n"
        '{"files": [{"filename": "...", "content": "...", "file_type": "..."}], '
        '"version_message": "short description of what was changed"}\n'
        "Include ALL files (modified and unmodified). "
        "file_type values: server_js, html, json."
    )

    user_message = (
        f"Here are the current files:\n\n{files_context}\n\n"
        f"Please make the following modification:\n{prompt}"
    )

    provider = await get_provider_instance(db)
    raw = await provider.complete([
        LLMMessage(role="system", content=system_prompt),
        LLMMessage(role="user", content=user_message),
    ])

    json_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not json_match:
        raise ValueError(f"LLM did not return valid JSON. Response: {raw[:200]}")

    return json.loads(json_match.group())


async def add_version(
    script_id: int,
    files: list,
    message: str,
    owner_email: str,
    db: AsyncSession,
) -> Script:
    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    next_number = (
        max((v.version_number for v in script.versions), default=0) + 1
    )

    version = ScriptVersion(
        script_id=script_id,
        version_number=next_number,
        message=message,
        created_by=owner_email,
    )
    db.add(version)
    await db.flush()

    for f in files:
        db.add(ScriptFile(
            version_id=version.id,
            filename=f.filename,
            content=f.content,
            file_type=f.file_type,
        ))

    await db.commit()
    return await get_script(script_id, db)
