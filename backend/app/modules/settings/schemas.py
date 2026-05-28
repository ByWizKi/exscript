from __future__ import annotations

from pydantic import BaseModel


class LLMSettingsOut(BaseModel):
    model: str


class LLMSettingsIn(BaseModel):
    model: str
