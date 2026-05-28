from __future__ import annotations

from google import genai
from google.genai import types

from app.core.config import settings

from .base import LLMMessage, LLMProvider


class VertexProvider(LLMProvider):
    def __init__(self, model: str):
        self._client = genai.Client(
            vertexai=True,
            project=settings.vertex_project_id,
            location=settings.vertex_location,
        )
        self._model = model

    async def complete(self, messages: list[LLMMessage]) -> str:
        system_parts = [m.content for m in messages if m.role == "system"]
        system_instruction = "\n\n".join(system_parts) if system_parts else None

        contents = [
            types.Content(
                role="user" if m.role == "user" else "model",
                parts=[types.Part(text=m.content)],
            )
            for m in messages
            if m.role != "system"
        ]

        config = types.GenerateContentConfig(
            temperature=0,
            system_instruction=system_instruction,
        )

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=contents,
            config=config,
        )
        return response.text
