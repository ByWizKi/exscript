from __future__ import annotations

from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from .base import LLMMessage, LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self._model = model
        self._client = AsyncAnthropic(api_key=api_key)

    async def complete(self, messages: list[LLMMessage]) -> str:
        system = next((m.content for m in messages if m.role == "system"), "")
        user_messages = [
            {"role": m.role, "content": m.content} for m in messages if m.role != "system"
        ]
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=8192,
            temperature=0,
            system=system,
            messages=user_messages,
        )
        return response.content[0].text

    async def complete_stream(self, messages: list[LLMMessage]) -> AsyncIterator[str]:
        result = await self.complete(messages)
        yield result
