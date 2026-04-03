import logging
import json
from services.llm_client import get_completion, get_completion_stream
from chat.exceptions import LLMAPIError
from chat.models import AIPrompt

logger = logging.getLogger("exhale")

CONTEXT_LABELS = {
    "Insight", "Technique", "Perspective", "Question", "Validation", "Reframe", "Resource"
}


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
    if "?" in current_text and not is_crisis:
        try:
            q_handling = AIPrompt.objects.get(name="question_handling_prompt").content
            messages.append({"role": "system", "content": q_handling})
        except AIPrompt.DoesNotExist:
            pass

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
                "content": "Do not ask a follow-up question in this reply. Provide support without ending in a question.",
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
