from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter()

GAS_BASE = "https://script.googleapis.com/v1"
DRIVE_BASE = "https://www.googleapis.com/drive/v3"


async def _google_get(url: str, access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
    if not res.is_success:
        try:
            detail = res.json().get("error", {}).get("message", f"Google API error {res.status_code}")
        except Exception:
            detail = f"Google API error {res.status_code}"
        raise HTTPException(status_code=res.status_code, detail=detail)
    return res.json()


@router.get("/projects")
async def list_gas_projects(access_token: str = Query(...)):
    # Drive API: list GAS script files (mimeType = google-apps.script)
    url = (
        f"{DRIVE_BASE}/files"
        "?q=mimeType%3D'application%2Fvnd.google-apps.script'"
        "&fields=files(id%2Cname%2Cparents)"
        "&pageSize=100"
    )
    data = await _google_get(url, access_token)
    return [
        {
            "scriptId": f["id"],
            "title": f.get("name", ""),
            "parentId": f.get("parents", [None])[0],
        }
        for f in data.get("files", [])
    ]


@router.get("/projects/{script_id}/files")
async def get_gas_files(script_id: str, access_token: str = Query(...)):
    data = await _google_get(f"{GAS_BASE}/projects/{script_id}/content", access_token)
    files = data.get("files", [])
    return [
        {
            "name": f["name"],
            "type": f["type"],
            "source": f.get("source", ""),
        }
        for f in files
        if f.get("source") is not None
    ]


@router.get("/sheets")
async def list_sheets(access_token: str = Query(...)):
    url = (
        f"{DRIVE_BASE}/files"
        "?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'"
        "&fields=files(id%2Cname)"
        "&pageSize=100"
    )
    data = await _google_get(url, access_token)
    return [{"id": f["id"], "name": f["name"]} for f in data.get("files", [])]
