import logging
from emotion.services.emotion_service import classify_emotion
from chat.services.llm_chat_service import (
    build_messages,
    get_empathetic_response,
    get_smart_action,
)
from chat.models import ChatMessage
from chat.graph.state import ChatState

logger = logging.getLogger("exhale")


def crisis_check_node(state: ChatState) -> ChatState:
    from emotion.services.emotion_service import check_crisis
    if check_crisis(state["text"]):
        logger.warning(
            "Crisis keyword detected — user_id=%s", state["user_id"]
        )
        state["is_crisis"] = True
        state["emotion"] = "sad"
        state["confidence"] = 1.0
    return state


def detect_emotion_node(state: ChatState) -> ChatState:
    result = classify_emotion(state["text"])
    state["emotion"] = result["emotion"]
    state["confidence"] = result.get("confidence", 1.0)
    state["is_crisis"] = result.get("is_crisis", False)
    return state


def retrieve_context_node(state: ChatState) -> ChatState:
    from knowledge.services.retrieval import retrieve
    state["context"] = retrieve(
        query_text=state["text"],
        emotion=state["emotion"],
        top_k=3,
        is_crisis=state["is_crisis"],
    )
    return state


def respond_node(state: ChatState) -> ChatState:
    from prompts.v1 import CRISIS_SYSTEM_PROMPT, CRISIS_RESPONSE_FALLBACK
    from services.llm_client import get_completion
    from chat.exceptions import LLMAPIError

    if state["is_crisis"]:
        try:
            messages = [
                {"role": "system", "content": CRISIS_SYSTEM_PROMPT},
                {"role": "user", "content": state["text"]},
            ]
            response = get_completion(messages, max_tokens=300, temperature=0.7)
            state["ai_response"] = response.strip()
        except Exception as e:
            logger.error("LLM crisis response failed: %s", str(e))
            state["ai_response"] = CRISIS_RESPONSE_FALLBACK["message"]
        state["smart_action"] = None
        return state

    history = (
        ChatMessage.objects.filter(
            conversation_id=state["conversation_id"]
        )
        .order_by("timestamp")
        .only("role", "content")
    )

    messages = build_messages(
        current_text=state["text"],
        emotion=state["emotion"],
        history=list(history),
        history_limit=6,
        context=state.get("context", []),
    )

    try:
        state["ai_response"] = get_empathetic_response(messages)
    except LLMAPIError:
        raise

    state["smart_action"] = get_smart_action(state["emotion"])
    return state