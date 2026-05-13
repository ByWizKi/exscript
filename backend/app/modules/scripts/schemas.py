from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime


class ScriptFileIn(BaseModel):
    filename: str
    content: str
    file_type: str = "server_js"


class ScriptFileOut(BaseModel):
    id: int
    filename: str
    content: str
    file_type: str

    model_config = {"from_attributes": True}


class ScriptVersionOut(BaseModel):
    id: int
    version_number: int
    message: str
    status: str
    created_by: str
    created_at: datetime
    files: list[ScriptFileOut] = []

    model_config = {"from_attributes": True}


class ScriptCreate(BaseModel):
    name: str
    gas_script_id: str
    spreadsheet_id: str
    files: list[ScriptFileIn]
    version_message: str = "Version initiale"


class ScriptOut(BaseModel):
    id: int
    name: str
    gas_script_id: str
    spreadsheet_id: str
    owner_email: str
    created_at: datetime
    latest_version: ScriptVersionOut | None = None

    model_config = {"from_attributes": True}


class ScriptListItem(BaseModel):
    id: int
    name: str
    gas_script_id: str
    spreadsheet_id: str
    owner_email: str
    created_at: datetime
    version_count: int
    latest_status: str | None

    model_config = {"from_attributes": True}
