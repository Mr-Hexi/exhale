import logging
from prompts.v1 import SYSTEM_PROMPTS, SMART_ACTIONS
from services.llm_client import get_completion
from chat.exceptions import LLMAPIError

logger = logging.getLogger("exhale")


def build_messages(
    current_text: str,
    emotion: str,
    history: list,
    history_limit: int = 6,
    context: list = None,
) -> list:
    """
    Build the messages list for the LLM call.
    history must be scoped to the current conversation only — never mix conversations.
    context is a list of retrieved RAG chunks to inject into the system prompt.
    """
    system_prompt = SYSTEM_PROMPTS.get(emotion, SYSTEM_PROMPTS["sad"])

    if context:
        context_block = "\n\n".join(context)
        system_prompt = (
            f"{system_prompt}\n\n"
            f"Here are some relevant techniques and insights you can draw from:\n{context_block}"
        )

    messages = [{"role": "system", "content": system_prompt}]

    for msg in history[-history_limit:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": current_text})
    return messages


def get_empathetic_response(messages: list) -> str:
    """
    Call the LLM and return the empathetic response text.
    Raises LLMAPIError on any failure.
    """
    try:
        response = get_completion(messages, max_tokens=200, temperature=0.7)
        logger.info("LLM completion succeeded")
        return response.strip()
    except Exception as e:
        logger.error("LLM completion failed: %s", str(e))
        raise LLMAPIError(f"LLM call failed: {str(e)}")


def get_smart_action(emotion: str) -> dict | None:
    """
    Return the SMART_ACTIONS entry for the given emotion.
    Returns None if emotion not found — never raises.
    """
    return SMART_ACTIONS.get(emotion, None)