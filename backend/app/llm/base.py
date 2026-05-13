from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, messages: list[LLMMessage]) -> str:
        """Send messages and return the assistant's text response."""
