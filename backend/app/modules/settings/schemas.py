from __future__ import annotations

from pydantic import BaseModel


class LLMSettingsOut(BaseModel):
    provider: str
    model: str
    api_key_set: bool
    base_url: str


class LLMSettingsIn(BaseModel):
    provider: str
    model: str
    api_key: str = ""
    base_url: str = ""
