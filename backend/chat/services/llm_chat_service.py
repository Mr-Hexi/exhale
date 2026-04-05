import logging
import re

from chat.exceptions import LLMAPIError
from chat.models import AIPrompt
from services.llm_client import get_completion, get_completion_stream

logger = logging.getLogger("exhale")

CONTEXT_LABELS = {
    "Insight",
    "Technique",
    "Perspective",
    "Question",
    "Validation",
    "Reframe",
    "Resource",
}

EXISTENTIAL_QUESTION_PATTERNS = (
    "what's the point",
    "whats the point",
    "what is the point",
    "point of trying",
    "why try",
    "why bother",
    "does anything matter",
)

CRISIS_STRICT_RULES = """
STRICT RULES:
- Do NOT ask "why", "what caused", or "what triggered"
- Do NOT use intimate terms like "sweetheart" or "dear"
- ALWAYS include support resources directly
- Keep tone calm, grounded, and supportive
""".strip()

BAD_CRISIS_PATTERNS = [
    r"why do you",
    r"what caused",
    r"what triggered",
    r"what do you mean",
    r"tell me why",
]


def is_existential_question(text: str | None) -> bool:
    if not text:
        return False

    text_lower = text.lower()
    return any(pattern in text_lower for pattern in EXISTENTIAL_QUESTION_PATTERNS)


def _format_context_block(context: list[str]) -> str:
    lines: list[str] = []
    for raw_item in context:
        if not raw_item:
            continue
        item = raw_item.strip()
        if not item:
            continue

        label = item.split(":", 1)[0].strip()
        if label in CONTEXT_LABELS and ":" in item:
            lines.append(f"- {item}")
        else:
            lines.append(f"- Insight: {item}")

    if not lines:
        return ""

    return "\n".join(lines)


def _get_prompt(name: str, *, emotion: str | None = None, default: str = "") -> str:
    try:
        if emotion is None:
            return AIPrompt.objects.get(name=name).content
        return AIPrompt.objects.get(name=name, emotion=emotion).content
    except AIPrompt.DoesNotExist:
        return default


def build_messages(
    current_text: str,
    emotion: str,
    history: list,
    history_limit: int = 6,
    context: list | None = None,
    stage: str = "general",
    is_crisis: bool = False,
    user_nickname: str | None = None,
    user_age: str | None = None,
    user_topics: list | None = None,
    journal_context: str | None = None,
) -> list:
    """Build prompt stack using the simplified standalone-style flow."""
    messages = []

    if is_crisis:
        crisis_prompt = _get_prompt("crisis_system_prompt", default="You are a crisis support AI.")
        system_prompt = f"{crisis_prompt}\n\n{CRISIS_STRICT_RULES}"
    else:
        base = _get_prompt("base_system_prompt", default="You are an empathetic companion.")
        emotion_text = _get_prompt("emotion_prompt", emotion=emotion, default="") if emotion else ""
        stage_text = _get_prompt("stage_prompt", emotion=stage, default="") if stage else ""
        anti_rep = _get_prompt("anti_repetition_prompt", default="")
        system_prompt = f"{base}\n\n{emotion_text}\n\n{stage_text}\n\n{anti_rep}".strip()

    # Keep existing personalization metadata, but only as lightweight system context.
    user_context_parts = []
    if user_nickname:
        user_context_parts.append(f"The user's nickname is '{user_nickname}'. Use it occasionally when appropriate.")
    if user_age:
        user_context_parts.append(f"The user is in the '{user_age}' age bracket. Keep this in mind to make your response age-appropriate.")
    if user_topics:
        topics_str = ", ".join(user_topics)
        user_context_parts.append(f"The user is also interested in overcoming or exploring these topics: {topics_str}.")

    if user_context_parts:
        system_prompt = f"{system_prompt}\n\n{' '.join(user_context_parts)}"

    if journal_context and not is_crisis:
        system_prompt += (
            "\n\nJOURNAL CONTEXT:\n"
            f"{journal_context.strip()}\n\n"
            "Use this context naturally to ground your response. Do not quote it verbatim unless the user asks."
        )

    if context and not is_crisis:
        context_block = _format_context_block(context)
        if context_block:
            system_prompt += (
                "\n\nCONTEXT BLOCK:\n"
                f"{context_block}\n\n"
                "Use this as supporting perspective. Do not repeat patterns."
            )

    messages.append({"role": "system", "content": system_prompt})

    if not is_crisis and ("?" in current_text or is_existential_question(current_text)):
        question_prompt = _get_prompt(
            "question_handling_prompt",
            default=(
                "The user asked a direct or implicit question. "
                "Answer it clearly and honestly first. Then provide emotional support if needed."
            ),
        )
        messages.append({"role": "system", "content": question_prompt})

    for msg in history[-history_limit:]:
        role = getattr(msg, "role", None) or msg.get("role")
        content = getattr(msg, "content", None) or msg.get("content")
        if role and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": current_text})
    return messages


def get_empathetic_response(messages: list) -> str:
    try:
        response = get_completion(messages, max_tokens=200, temperature=0.7)
        logger.info("LLM completion succeeded")
        return response.strip()
    except Exception as error:
        logger.error("LLM completion failed: %s", str(error))
        raise LLMAPIError(f"LLM call failed: {str(error)}")


def get_empathetic_response_stream(messages: list, stream_queue) -> str:
    try:
        full_text = ""
        for chunk in get_completion_stream(messages, max_tokens=200, temperature=0.7):
            stream_queue.put({"type": "chunk", "content": chunk})
            full_text += chunk
        logger.info("LLM stream completion succeeded")
        return full_text.strip()
    except Exception as error:
        logger.error("LLM stream failed: %s", str(error))
        raise LLMAPIError(f"LLM stream failed: {str(error)}")


def enforce_crisis_safety(text: str) -> str:
    if not text:
        return text

    cleaned = text
    lower = cleaned.lower()

    for pattern in BAD_CRISIS_PATTERNS:
        if re.search(pattern, lower):
            cleaned = re.sub(r"[^.]*\?\s*", "", cleaned)
            lower = cleaned.lower()

    cleaned = cleaned.replace("sweetheart", "")
    cleaned = cleaned.replace("dear", "")
    return cleaned.strip()
