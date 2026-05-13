from __future__ import annotations
from .base import LLMProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .gemini_provider import GeminiProvider


def get_provider(name: str, model: str, api_key: str, base_url: str | None = None) -> LLMProvider:
    name = name.lower()
    if name == "openai":
        return OpenAIProvider(api_key=api_key, model=model)
    if name == "anthropic":
        return AnthropicProvider(api_key=api_key, model=model)
    if name == "gemini":
        return GeminiProvider(api_key=api_key, model=model)
    if name == "ollama":
        return OpenAIProvider(
            api_key="ollama",
            model=model,
            base_url=base_url or "http://localhost:11434/v1",
        )
    raise ValueError(f"Unknown LLM provider: {name}. Supported: openai, anthropic, gemini, ollama")
