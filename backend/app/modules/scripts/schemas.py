from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


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
    versions: list[ScriptVersionOut] = []

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


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AIModifyRequest(BaseModel):
    prompt: str
    google_access_token: str | None = None
    history: list[ChatMessage] = []


class AIFileResult(BaseModel):
    filename: str
    content: str
    file_type: str


class AIModifyResponse(BaseModel):
    files: list[AIFileResult]
    version_message: str


class VersionCreate(BaseModel):
    files: list[ScriptFileIn]
    message: str


class PushRequest(BaseModel):
    access_token: str


class ScriptUpdate(BaseModel):
    name: str | None = None
    gas_script_id: str | None = None
    spreadsheet_id: str | None = None
