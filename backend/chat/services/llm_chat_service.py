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

MAX_CONVERSATION_TITLE_LENGTH = 80


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
    emotion_history: list[str] | None = None,
    stage_history: list[str] | None = None,
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

    filtered_emotions = [e for e in (emotion_history or []) if e]
    filtered_stages = [s for s in (stage_history or []) if s]
    if len(filtered_emotions) >= 2 and not is_crisis:
        trend_parts = []
        emotion_counts = {}
        for e in filtered_emotions:
            emotion_counts[e] = emotion_counts.get(e, 0) + 1
        dominant = sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True)
        parts = [f"{label} ({count}x)" for label, count in dominant]
        trend_parts.append(f"Emotions detected in this conversation: {', '.join(parts)}")
        recent_emotions = filtered_emotions[-6:]
        if len(set(recent_emotions)) < len(recent_emotions):
            repeats = [e for e in set(recent_emotions) if recent_emotions.count(e) > 1]
            if repeats:
                trend_parts.append(f"The user has been feeling {', '.join(repeats)} repeatedly in recent messages — acknowledge this growing pattern.")
        if filtered_stages:
            stage_counts = {}
            for s in filtered_stages:
                stage_counts[s] = stage_counts.get(s, 0) + 1
            dominant_stage = max(stage_counts, key=stage_counts.get)
            if dominant_stage != "general" and stage_counts[dominant_stage] >= 2:
                trend_parts.append(f"The conversation has touched on {dominant_stage.replace('_', ' ')} multiple times.")
        trend_parts.append(
            "If appropriate, reference this pattern naturally to show you're tracking their journey. "
            "For example: 'You mentioned feeling anxious before too' or 'This seems to be a recurring theme for you.' "
            "Keep it brief and empathetic — don't sound clinical or like you're reading statistics."
        )
        system_prompt += "\n\nCONVERSATION TREND:\n" + "\n".join(trend_parts)

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


def _fallback_title_from_message(first_message: str) -> str:
    words = re.findall(r"[A-Za-z0-9']+", first_message or "")
    if not words:
        return "New Chat"

    title = " ".join(words[:6]).strip()
    title = title[:MAX_CONVERSATION_TITLE_LENGTH].strip()
    return title or "New Chat"


def _clean_generated_title(raw_title: str | None, first_message: str) -> str:
    if not raw_title:
        return _fallback_title_from_message(first_message)

    cleaned = raw_title.strip().strip('"').strip("'")
    cleaned = re.sub(r"^title\s*:\s*", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = " ".join(cleaned.split())
    cleaned = cleaned[:MAX_CONVERSATION_TITLE_LENGTH].strip()

    if not cleaned:
        return _fallback_title_from_message(first_message)

    return cleaned


def generate_conversation_title(first_message: str) -> str:
    prompt = (
        "Create a short conversation title based only on the user's message.\n"
        "Rules:\n"
        "- 2 to 6 words\n"
        "- plain text only\n"
        "- no quotes, emojis, or punctuation at the ends\n"
        "- do not include the word 'title'\n"
        "- reflect the user's main topic"
    )

    try:
        generated = get_completion(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": first_message},
            ],
            max_tokens=20,
            temperature=0.2,
        )
        return _clean_generated_title(generated, first_message)
    except Exception as error:
        logger.warning("Conversation title generation failed, using fallback: %s", str(error))
        return _fallback_title_from_message(first_message)
