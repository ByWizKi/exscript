from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from .crud import add_version, get_script
from .schemas import ScriptFileIn

FILE_TYPE_TO_GAS = {"server_js": "SERVER_JS", "html": "HTML", "json": "JSON"}
GAS_TO_FILE_TYPE = {"SERVER_JS": "server_js", "HTML": "html", "JSON": "json"}
GAS_TO_EXT = {"SERVER_JS": ".js", "HTML": ".html", "JSON": ".json"}


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


async def _fetch_files_from_gas(gas_script_id: str, access_token: str) -> list[ScriptFileIn]:
    import httpx

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://script.googleapis.com/v1/projects/{gas_script_id}/content",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if not res.is_success:
        try:
            detail = (
                res.json().get("error", {}).get("message", f"Erreur Apps Script {res.status_code}")
            )
        except Exception:
            detail = f"Erreur Apps Script {res.status_code}"
        raise Exception(detail)

    data = res.json()
    files = [
        ScriptFileIn(
            filename=f["name"] + GAS_TO_EXT.get(f.get("type", "SERVER_JS"), ".js"),
            content=f.get("source") or "",
            file_type=GAS_TO_FILE_TYPE.get(f.get("type", "SERVER_JS"), "server_js"),
        )
        for f in data.get("files", [])
        if f.get("type") != "JSON" or f.get("name") == "appsscript"
    ]

    if not files:
        raise ValueError("Aucun fichier retourné par Apps Script")

    return files


async def fetch_from_gas_preview(
    script_id: int, access_token: str, db: AsyncSession
) -> list[ScriptFileIn]:
    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script non trouvé")
    return await _fetch_files_from_gas(script.gas_script_id, access_token)


async def pull_from_gas(script_id: int, access_token: str, email: str, db: AsyncSession) -> object:
    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script non trouvé")

    files = await _fetch_files_from_gas(script.gas_script_id, access_token)
    return await add_version(script_id, files, "Pull depuis Google Apps Script", email, db)
