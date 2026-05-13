from __future__ import annotations
from openai import AsyncOpenAI
from .base import LLMProvider, LLMMessage


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str, base_url: str | None = None):
        self._model = model
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url or None)

    async def complete(self, messages: list[LLMMessage]) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=0,
        )
        return response.choices[0].message.content or ""
