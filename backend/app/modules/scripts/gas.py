from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from .crud import get_script

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
