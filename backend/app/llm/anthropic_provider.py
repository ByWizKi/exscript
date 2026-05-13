from __future__ import annotations
from anthropic import AsyncAnthropic
from .base import LLMProvider, LLMMessage


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self._model = model
        self._client = AsyncAnthropic(api_key=api_key)

    async def complete(self, messages: list[LLMMessage]) -> str:
        system = next((m.content for m in messages if m.role == "system"), "")
        user_messages = [
            {"role": m.role, "content": m.content}
            for m in messages if m.role != "system"
        ]
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=8192,
            system=system,
            messages=user_messages,
        )
        return response.content[0].text
