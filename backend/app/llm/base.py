from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class LLMMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, messages: list[LLMMessage]) -> str:
        """Send messages and return the assistant's text response."""

    async def complete_stream(self, messages: list[LLMMessage]) -> AsyncIterator[str]:
        """Stream the response chunk by chunk. Default: yield complete() in one block."""
        result = await self.complete(messages)
        yield result
