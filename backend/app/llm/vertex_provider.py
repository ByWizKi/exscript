from __future__ import annotations

from collections.abc import AsyncIterator

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

    async def complete_stream(self, messages: list[LLMMessage]) -> AsyncIterator[str]:
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

        async for chunk in self._client.aio.models.generate_content_stream(
            model=self._model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield chunk.text

    async def complete(self, messages: list[LLMMessage]) -> str:
        parts: list[str] = []
        async for chunk in self.complete_stream(messages):
            parts.append(chunk)
        return "".join(parts)
