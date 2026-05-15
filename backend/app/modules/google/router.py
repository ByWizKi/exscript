from __future__ import annotations

import asyncio
import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter()

GAS_BASE = "https://script.googleapis.com/v1"
DRIVE_BASE = "https://www.googleapis.com/drive/v3"


async def _google_get(url: str, access_token: str, raise_on_error: bool = True) -> dict | None:
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
    if not res.is_success:
        if not raise_on_error:
            return None
        try:
            detail = (
                res.json().get("error", {}).get("message", f"Google API error {res.status_code}")
            )
        except Exception:
            detail = f"Google API error {res.status_code}"
        raise HTTPException(status_code=res.status_code, detail=detail)
    return res.json()


@router.get("/projects")
async def list_gas_projects(access_token: str = Query(...)):
    # Stratégie combinée :
    # 1. Drive API : scripts GAS visibles (standalone + certains container-bound)
    # 2. Apps Script processes API : découvrir les scriptIds récemment exécutés
    # 3. Pour chaque scriptId trouvé, récupérer le parentId via /v1/projects/{id}
    # 4. Croiser avec les sheets pour ne garder que les scripts liés à un sheet

    async with httpx.AsyncClient() as client:
        # Appels parallèles
        r_scripts, r_processes, r_sheets = await asyncio.gather(
            client.get(
                f"{DRIVE_BASE}/files"
                "?q=mimeType%3D'application%2Fvnd.google-apps.script'"
                "&fields=files(id%2Cname)&pageSize=1000"
                "&includeItemsFromAllDrives=true&supportsAllDrives=true",
                headers={"Authorization": f"Bearer {access_token}"},
            ),
            client.get(
                f"{GAS_BASE}/processes?pageSize=200"
                "&userProcessFilter.statuses=RUNNING"
                "&userProcessFilter.statuses=COMPLETED"
                "&userProcessFilter.statuses=FAILED",
                headers={"Authorization": f"Bearer {access_token}"},
            ),
            client.get(
                f"{DRIVE_BASE}/files"
                "?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'"
                "&fields=files(id%2Cname)&pageSize=1000"
                "&includeItemsFromAllDrives=true&supportsAllDrives=true",
                headers={"Authorization": f"Bearer {access_token}"},
            ),
        )

    sheets_list = r_sheets.json().get("files", []) if r_sheets.is_success else []
    sheets = {s["id"]: s["name"] for s in sheets_list}

    # Collecter les scriptIds uniques depuis Drive + processes
    script_ids: set[str] = set()
    if r_scripts.is_success:
        for f in r_scripts.json().get("files", []):
            script_ids.add(f["id"])
    if r_processes.is_success:
        for p in r_processes.json().get("processes", []):
            sid = p.get("projectName") or p.get("scriptId")
            if sid:
                script_ids.add(sid)

    print(f"[DEBUG] unique script_ids={len(script_ids)} sheets={len(sheets)}")

    # Appels parallèles pour récupérer les métadonnées de chaque script
    async def fetch_project(client: httpx.AsyncClient, sid: str) -> dict | None:
        r = await client.get(
            f"{GAS_BASE}/projects/{sid}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if r.is_success:
            return r.json()
        return None

    async with httpx.AsyncClient() as client:
        project_metas = await asyncio.gather(*[fetch_project(client, sid) for sid in script_ids])

    results = []
    seen_sheets: set[str] = set()
    for meta in project_metas:
        if not meta:
            continue
        parent_id = meta.get("parentId")
        sid = meta.get("scriptId")
        if parent_id and parent_id in sheets and parent_id not in seen_sheets:
            seen_sheets.add(parent_id)
            results.append(
                {
                    "scriptId": sid,
                    "title": sheets[parent_id],
                    "parentId": parent_id,
                }
            )

    print(f"[DEBUG] final results={len(results)}")
    return results


@router.get("/projects/{sheet_id}/check")
async def check_sheet_script(sheet_id: str, access_token: str = Query(...)):
    """Cherche le script GAS lié à un sheet via Drive (par parentId ou par nom)."""
    async with httpx.AsyncClient() as client:
        # 1. Chercher un script dont le parent Drive est ce sheet
        r1 = await client.get(
            f"{DRIVE_BASE}/files"
            f"?q=mimeType%3D'application%2Fvnd.google-apps.script'+and+'{sheet_id}'+in+parents"
            "&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        print(f"[CHECK] parent search status={r1.status_code} body={r1.text[:300]}")
        if r1.is_success:
            files = r1.json().get("files", [])
            if files:
                script_id = files[0]["id"]
                return {"hasScript": True, "scriptId": script_id, "title": files[0].get("name", "")}

        # 2. Chercher un script avec le même nom que le sheet
        # D'abord récupérer le nom du sheet
        r_sheet = await client.get(
            f"{DRIVE_BASE}/files/{sheet_id}?fields=name",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if r_sheet.is_success:
            sheet_name = r_sheet.json().get("name", "")
            r2 = await client.get(
                f"{DRIVE_BASE}/files"
                f"?q=mimeType%3D'application%2Fvnd.google-apps.script'+and+name%3D'{sheet_name}'"
                "&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            body_text = r2.text[:300]
            print(
                f"[CHECK] name search for '{sheet_name}' status={r2.status_code} body={body_text}"
            )
            if r2.is_success:
                files2 = r2.json().get("files", [])
                if files2:
                    return {
                        "hasScript": True,
                        "scriptId": files2[0]["id"],
                        "title": files2[0].get("name", ""),
                    }

    return {"hasScript": False}


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
        "&pageSize=1000"
        "&includeItemsFromAllDrives=true"
        "&supportsAllDrives=true"
    )
    data = await _google_get(url, access_token)
    return [{"id": f["id"], "name": f["name"]} for f in data.get("files", [])]
