import os
import logging
from openai import OpenAI

logger = logging.getLogger("exhale")

PROVIDER_CONFIGS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
    },
    "llmapi": {
        "base_url": "https://api.llmapi.com",
        "api_key_env": "LLMAPI_API_KEY",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_env": "GEMINI_API_KEY",
    },
    "groq": {                                      # ← add this
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
    },
}

def _build_client() -> tuple[OpenAI, str]:
    provider = os.getenv("LLM_PROVIDER", "openrouter").lower()
    config = PROVIDER_CONFIGS.get(provider)

    if not config:
        raise ValueError(f"Unknown LLM_PROVIDER: '{provider}'. Choose from: {list(PROVIDER_CONFIGS)}")

    api_key = os.getenv(config["api_key_env"])
    if not api_key:
        raise ValueError(f"Missing env var: {config['api_key_env']} for provider '{provider}'")

    model = os.getenv("LLM_MODEL")
    if not model:
        raise ValueError("Missing env var: LLM_MODEL")

    client = OpenAI(base_url=config["base_url"], api_key=api_key)
    logger.info("LLM client initialised — provider: %s, model: %s", provider, model)
    return client, model


# Load once at startup
llm_client, LLM_MODEL = _build_client()


def get_completion(
    messages: list[dict],
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> str:
    response = llm_client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    content = response.choices[0].message.content
    if content is None:
        logger.error(
            "LLM returned None content — finish_reason: %s",
            response.choices[0].finish_reason,
        )
        raise ValueError(
            f"LLM returned no content (finish_reason: {response.choices[0].finish_reason})"
        )
    return content.strip()

def get_completion_stream(
    messages: list[dict],
    max_tokens: int = 300,
    temperature: float = 0.7,
):
    response = llm_client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True
    )
    for chunk in response:
        if len(chunk.choices) > 0:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta