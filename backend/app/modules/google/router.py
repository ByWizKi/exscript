from __future__ import annotations

from fastapi import APIRouter, Query

from .service import check_sheet_script, get_gas_files, list_gas_projects, list_sheets

router = APIRouter()


@router.get("/projects")
async def list_gas_projects_endpoint(access_token: str = Query(...)):
    return await list_gas_projects(access_token)


@router.get("/projects/{sheet_id}/check")
async def check_sheet_script_endpoint(sheet_id: str, access_token: str = Query(...)):
    return await check_sheet_script(sheet_id, access_token)


@router.get("/projects/{script_id}/files")
async def get_gas_files_endpoint(script_id: str, access_token: str = Query(...)):
    return await get_gas_files(script_id, access_token)


@router.get("/sheets")
async def list_sheets_endpoint(access_token: str = Query(...)):
    return await list_sheets(access_token)
