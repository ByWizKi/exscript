from __future__ import annotations

import google.generativeai as genai

from .base import LLMMessage, LLMProvider


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model)

    async def complete(self, messages: list[LLMMessage]) -> str:
        parts = []
        for m in messages:
            if m.role == "system":
                parts.append(f"[System Instructions]\n{m.content}")
            elif m.role == "user":
                parts.append(f"[User]\n{m.content}")
        prompt = "\n\n".join(parts)
        config = genai.types.GenerationConfig(temperature=0)
        response = await self._model.generate_content_async(prompt, generation_config=config)
        return response.text
