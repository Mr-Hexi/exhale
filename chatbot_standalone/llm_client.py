"""LLM client wrapper for OpenAI-compatible providers.

This module isolates provider selection and raw completion calls so the rest
of the chatbot code can stay provider-agnostic.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from openai import OpenAI

PROVIDER_CONFIGS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_env": "GEMINI_API_KEY",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
    },
    "llmapi": {
        "base_url": "https://api.llmapi.com",
        "api_key_env": "LLMAPI_API_KEY",
    },
}


@dataclass
class LLMClient:
    """Thin adapter around `openai.OpenAI` chat completions."""

    client: OpenAI
    model: str

    @classmethod
    def from_env(cls):
        """Build an `LLMClient` from environment configuration.

        Args:
            cls: Dataclass type used to instantiate the client.

        Returns:
            LLMClient: Configured client containing provider transport + model id.

        Raises:
            ValueError: If provider is unsupported or required env vars are missing.
        """
        provider = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
        config = PROVIDER_CONFIGS.get(provider)
        if not config:
            raise ValueError(
                f"Unknown LLM_PROVIDER: '{provider}'. Choose from: {list(PROVIDER_CONFIGS)}"
            )

        api_key = os.getenv(config["api_key_env"])
        if not api_key:
            raise ValueError(
                f"Missing env var: {config['api_key_env']} for provider '{provider}'"
            )

        model = os.getenv("LLM_MODEL")
        if not model:
            raise ValueError("Missing env var: LLM_MODEL")

        return cls(client=OpenAI(base_url=config["base_url"], api_key=api_key), model=model)

    def completion(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 220,
        temperature: float = 0.7,
    ) -> str:
        """Generate one assistant response from chat messages.

        Args:
            messages: OpenAI-chat formatted messages in conversation order.
            max_tokens: Maximum output token budget for this completion.
            temperature: Sampling temperature (higher = more randomness).

        Returns:
            str: Trimmed assistant text content.

        Raises:
            ValueError: If provider returns an empty/None message payload.
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        content = response.choices[0].message.content
        if content is None:
            raise ValueError(
                f"LLM returned no content (finish_reason: {response.choices[0].finish_reason})"
            )
        return content.strip()
