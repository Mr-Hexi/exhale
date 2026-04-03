import logging
import json
import re
from services.llm_client import get_completion, get_completion_stream
from chat.exceptions import LLMAPIError
from chat.models import AIPrompt

logger = logging.getLogger("exhale")

CONTEXT_LABELS = {
    "Insight", "Technique", "Perspective", "Question", "Validation", "Reframe", "Resource"
}

EXISTENTIAL_QUESTION_PATTERNS = (
    "what's the point",
    "whats the point",
    "what is the point",
    "point of trying",
    "why try",
    "why should i try",
    "why bother",
    "no point trying",
    "does anything matter",
)

NUMBNESS_KEYWORDS = (
    "numb",
    "feel nothing",
    "can not feel anything",
    "can't feel anything",
    "empty inside",
    "emotionally flat",
    "disconnected",
)

INSIGHT_REQUIRED_STAGES = {"burnout", "hopelessness", "self_doubt"}
DEEP_STAGES = {"burnout", "hopelessness"}
NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
}


def is_deep_stage(stage: str | None) -> bool:
    return (stage or "").lower() in DEEP_STAGES


def is_existential_question(text: str | None) -> bool:
    if not text:
        return False

    text_lower = text.lower()
    return any(pattern in text_lower for pattern in EXISTENTIAL_QUESTION_PATTERNS)


def requires_meaningful_insight(current_text: str | None, stage: str | None) -> bool:
    stage_name = (stage or "").lower()
    if stage_name in INSIGHT_REQUIRED_STAGES:
        return True

    if not current_text:
        return False

    text_lower = current_text.lower()
    return any(keyword in text_lower for keyword in NUMBNESS_KEYWORDS)


def parse_response_policy(current_text: str | None, user_history_texts: list[str] | None = None) -> dict:
    """
    Build a lightweight policy from recent user directives.
    Latest directive wins, so user can override prior constraints naturally.
    """
    entries = list(user_history_texts or [])
    if current_text:
        entries.append(current_text)

    policy = {
        "no_question": False,
        "no_extra_prompt": False,
        "max_sentences": None,
    }

    for text in entries:
        if not text:
            continue
        lower = text.lower()

        if any(token in lower for token in ("no question", "do not ask", "don't ask", "without question")):
            policy["no_question"] = True
        if any(token in lower for token in ("you can ask", "feel free to ask", "ask me a question")):
            policy["no_question"] = False

        if any(token in lower for token in ("no helpful prompt", "no extra prompt", "without extra prompt")):
            policy["no_extra_prompt"] = True
        if any(token in lower for token in ("helpful prompt is okay", "you can add prompt", "extra prompt is okay")):
            policy["no_extra_prompt"] = False

        digit_match = re.search(r"\b(?:exactly|only|just)?\s*(\d+)\s*(?:short\s*)?sentences?\b", lower)
        word_match = re.search(r"\b(?:exactly|only|just)?\s*(one|two|three|four|five)\s*(?:short\s*)?sentences?\b", lower)
        one_sentence_match = re.search(r"\bone sentence\b", lower)
        if digit_match:
            policy["max_sentences"] = max(1, min(int(digit_match.group(1)), 5))
        elif word_match:
            policy["max_sentences"] = NUMBER_WORDS[word_match.group(1)]
        elif one_sentence_match:
            policy["max_sentences"] = 1

    return policy


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

    return "Relevant insights and support patterns:\n" + "\n".join(lines)


def build_messages(
    current_text: str,
    emotion: str,
    history: list,
    history_limit: int = 6,
    context: list = None,
    stage: str = "general",
    is_crisis: bool = False,
    user_nickname: str = None,
    user_age: str = None,
    user_topics: list = None,
    can_ask_question: bool = True,
    force_answer: bool = False,
    needs_insight: bool = False,
    response_policy: dict | None = None,
) -> list:
    """
    Build the messages list for the LLM call dynamically using DB Prompts.
    """
    messages = []
    
    if is_crisis:
        try:
            system_prompt = AIPrompt.objects.get(name="crisis_system_prompt").content
        except AIPrompt.DoesNotExist:
            system_prompt = "You are a crisis support AI."
    else:
        # Construct dynamic base system prompt
        try:
            base = AIPrompt.objects.get(name="base_system_prompt").content
        except AIPrompt.DoesNotExist:
            base = "You are an empathetic companion."
            
        emotion_text = ""
        if emotion:
            try:
                emotion_text = AIPrompt.objects.get(name="emotion_prompt", emotion=emotion).content
            except AIPrompt.DoesNotExist:
                pass
                
        stage_text = ""
        if stage:
            try:
                stage_text = AIPrompt.objects.get(name="stage_prompt", emotion=stage).content
            except AIPrompt.DoesNotExist:
                pass

        try:
            anti_rep = AIPrompt.objects.get(name="anti_repetition_prompt").content
        except:
            anti_rep = ""

        # Combine them all
        system_prompt = f"{base}\n\n{emotion_text}\n\n{stage_text}\n\n{anti_rep}"

    # Build user context string dynamically
    user_context_parts = []
    if user_nickname:
        user_context_parts.append(f"The user's nickname is '{user_nickname}'. Use it occasionally when appropriate.")
    if user_age:
        user_context_parts.append(f"The user is in the '{user_age}' age bracket. Keep this in mind to make your response age-appropriate.")
    if user_topics:
        topics_str = ", ".join(user_topics)
        user_context_parts.append(f"The user is also interested in overcoming or exploring these topics: {topics_str}.")
        
    if user_context_parts:
        user_context_str = " ".join(user_context_parts)
        system_prompt = f"{system_prompt}\n\n{user_context_str}"

    if context:
        context_block = _format_context_block(context)
    else:
        context_block = ""

    if context_block:
        system_prompt = (
            f"{system_prompt}\n\n"
            "CONTEXT BLOCK:\n"
            f"{context_block}\n"
            "Use this block as supporting perspective, and avoid repeating the same pattern in one reply."
        )

    messages.append({"role": "system", "content": system_prompt})

    # Add question handling dynamically if there's a question mark
    existential_question = is_existential_question(current_text)
    should_force_answer = force_answer or existential_question

    if ("?" in current_text or should_force_answer) and not is_crisis:
        try:
            q_handling = AIPrompt.objects.get(name="question_handling_prompt").content
            messages.append({"role": "system", "content": q_handling})
        except AIPrompt.DoesNotExist:
            pass
    if should_force_answer and not is_crisis:
        messages.append(
            {
                "role": "system",
                "content": (
                    "The user asked a deep or existential question. "
                    "You MUST answer it directly and clearly in 1-2 sentences before anything else. "
                    "Do not avoid or soften the question."
                ),
            }
        )
    if (needs_insight or requires_meaningful_insight(current_text, stage)) and not is_crisis:
        messages.append(
            {
                "role": "system",
                "content": (
                    "If needs_insight is True, include at least one meaningful psychological insight. "
                    "Do not provide only validation."
                ),
            }
        )
    if response_policy and not is_crisis:
        policy_lines = []
        if response_policy.get("no_question"):
            policy_lines.append("Do NOT ask any question in this reply.")
        if response_policy.get("max_sentences"):
            policy_lines.append(f"Use at most {response_policy['max_sentences']} sentence(s).")
        if response_policy.get("no_extra_prompt"):
            policy_lines.append("Do not include add-on suggestions labelled as extra/helpful prompts.")
        if policy_lines:
            messages.append({"role": "system", "content": " ".join(policy_lines)})

    for msg in history[-history_limit:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": current_text})
    
    if can_ask_question:
        try:
            messages.append(
                {
                    "role": "system",
                    "content": AIPrompt.objects.get(name="question_variety_prompt").content,
                }
            )
        except AIPrompt.DoesNotExist:
            pass
    else:
        messages.append(
            {
                "role": "system",
                "content": (
                    "If can_ask_question is False: Do NOT ask any question in your response. "
                    "Provide support without ending in a question."
                ),
            }
        )
    return messages


def get_empathetic_response(messages: list) -> str:
    try:
        response = get_completion(messages, max_tokens=200, temperature=0.7)
        logger.info("LLM completion succeeded")
        return response.strip()
    except Exception as e:
        logger.error("LLM completion failed: %s", str(e))
        raise LLMAPIError(f"LLM call failed: {str(e)}")


def get_empathetic_response_stream(messages: list, stream_queue) -> str:
    try:
        full_text = ""
        for chunk in get_completion_stream(messages, max_tokens=200, temperature=0.7):
            stream_queue.put({"type": "chunk", "content": chunk})
            full_text += chunk
        logger.info("LLM stream completion succeeded")
        return full_text.strip()
    except Exception as e:
        logger.error("LLM stream failed: %s", str(e))
        raise LLMAPIError(f"LLM stream failed: {str(e)}")


def get_smart_action(emotion: str) -> dict | None:
    try:
        action_obj = AIPrompt.objects.get(name="smart_action", emotion=emotion)
        return json.loads(action_obj.content)
    except AIPrompt.DoesNotExist:
        return None


def should_send_cbt_followup(
    *,
    emotion: str | None,
    is_crisis: bool,
    stage: str | None,
    current_text: str | None,
    response_policy: dict | None = None,
) -> bool:
    """
    Guard CBT follow-ups so we do not ask extra probing questions in deep/existential flows.
    """
    if is_crisis:
        return False
    if emotion not in {"sad", "anxious"}:
        return False
    if is_deep_stage(stage):
        return False
    if is_existential_question(current_text):
        return False
    if response_policy and response_policy.get("no_extra_prompt"):
        return False
    return True


def enforce_response_policy(response: str | None, response_policy: dict | None) -> str | None:
    if not response:
        return response
    if not response_policy:
        return response

    output = response.strip()

    max_sentences = response_policy.get("max_sentences")
    if isinstance(max_sentences, int) and max_sentences > 0:
        sentences = re.split(r"(?<=[.!?]) +", output)
        output = " ".join(sentences[:max_sentences]).strip()

    if response_policy.get("no_question"):
        output = output.replace("?", ".")
        output = re.sub(r"\s+\.", ".", output)
        output = re.sub(r"\.{2,}", ".", output).strip()

    return output
