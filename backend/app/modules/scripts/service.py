from __future__ import annotations

import json
import re

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.script import Script, ScriptFile, ScriptVersion

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
    script = result.scalar_one_or_none()
    if script and script.versions:
        script.versions = [max(script.versions, key=lambda v: v.version_number)]
    return script


async def _fetch_sheets_context(spreadsheet_id: str, access_token: str) -> str:
    import httpx

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}",
            params={"includeGridData": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if not r.is_success:
        return ""

    data = r.json()
    lines = [f"Spreadsheet: {data.get('properties', {}).get('title', spreadsheet_id)}"]

    for sheet in data.get("sheets", []):
        props = sheet.get("properties", {})
        title = props.get("title", "Sheet")
        lines.append(f"\n## Feuille : {title}")

        grid_data = sheet.get("data", [])
        if not grid_data:
            continue

        rows = grid_data[0].get("rowData", [])
        if not rows:
            continue

        table_rows = []
        for row in rows:
            cells = row.get("values", [])
            row_vals = [c.get("formattedValue", "") or "" for c in cells]
            # Trim trailing empty cells
            while row_vals and row_vals[-1] == "":
                row_vals.pop()
            if any(row_vals):
                table_rows.append(row_vals)

        if not table_rows:
            continue

        # First row as headers
        max_cols = max(len(r) for r in table_rows)
        headers = table_rows[0] + [""] * (max_cols - len(table_rows[0]))
        lines.append("Colonnes : " + " | ".join(headers))
        lines.append(f"Nombre de lignes de données : {len(table_rows) - 1}")

        # Show up to 5 sample rows
        for row in table_rows[1:6]:
            row += [""] * (max_cols - len(row))
            lines.append("  " + " | ".join(row))
        if len(table_rows) > 6:
            lines.append(f"  ... ({len(table_rows) - 6} lignes supplémentaires)")

    return "\n".join(lines)


async def ai_modify_script(
    script_id: int,
    prompt: str,
    db: AsyncSession,
    google_access_token: str | None = None,
    history: list | None = None,
) -> dict:
    from app.llm.base import LLMMessage
    from app.modules.settings.service import get_provider_instance

    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    latest = script.versions[0] if script.versions else None
    if not latest or not latest.files:
        raise ValueError("No files found in the latest version")

    files_context = "\n\n".join(
        f"### {f.filename}\n```javascript\n{f.content}\n```" for f in latest.files
    )

    sheets_context = ""
    if google_access_token and script.spreadsheet_id:
        sheets_context = await _fetch_sheets_context(script.spreadsheet_id, google_access_token)

    system_prompt = (
        "You are a Google Apps Script expert and a precise code editor.\n"
        "CRITICAL RULES — follow them exactly:\n"
        "1. Apply EXACTLY what the user asks. Do not add, remove, or change anything else.\n"
        "2. Return ONLY a raw JSON object. No markdown, no ```json, no explanation, "
        "no text before or after.\n"
        "3. The JSON must have this exact structure:\n"
        '   {"files": [{"filename": "...", "content": "...", "file_type": "..."}], '
        '"version_message": "..."}\n'
        "4. Include ALL files — both modified and unmodified — in the 'files' array.\n"
        "5. Preserve the original code style, indentation, and comments.\n"
        "6. file_type values: server_js (for .js/.gs), html (for .html), json (for .json).\n"
        "7. version_message must be a short French sentence describing what was changed.\n"
        "IMPORTANT: Your entire response must be valid JSON and nothing else."
    )

    sheets_section = f"\n\nGoogle Sheets context:\n{sheets_context}" if sheets_context else ""

    user_message = (
        f"Current project files:\n\n{files_context}"
        f"{sheets_section}\n\n"
        f"User request: {prompt}\n\n"
        "Apply this modification and return the complete JSON response."
    )

    messages: list[LLMMessage] = [LLMMessage(role="system", content=system_prompt)]
    for h in history or []:
        messages.append(LLMMessage(role=h.role, content=h.content))
    messages.append(LLMMessage(role="user", content=user_message))

    provider = await get_provider_instance(db)
    raw = await provider.complete(messages)

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

    next_number = max((v.version_number for v in script.versions), default=0) + 1

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


FILE_TYPE_TO_GAS = {"server_js": "SERVER_JS", "html": "HTML", "json": "JSON"}


async def push_to_gas(script_id: int, access_token: str, db: AsyncSession) -> None:
    import httpx

    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script non trouvé")
    latest = script.latest_version
    if not latest or not latest.files:
        raise ValueError("Aucun fichier à pousser")

    files_payload = [
        {
            "name": f.filename.rsplit(".", 1)[0] if "." in f.filename else f.filename,
            "type": FILE_TYPE_TO_GAS.get(f.file_type, "SERVER_JS"),
            "source": f.content,
        }
        for f in latest.files
    ]

    async with httpx.AsyncClient() as client:
        res = await client.put(
            f"https://script.googleapis.com/v1/projects/{script.gas_script_id}/content",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"files": files_payload},
        )

    if not res.is_success:
        try:
            detail = (
                res.json().get("error", {}).get("message", f"Erreur Apps Script {res.status_code}")
            )
        except Exception:
            detail = f"Erreur Apps Script {res.status_code}"
        raise Exception(detail)
