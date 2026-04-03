import logging
import re
from emotion.services.emotion_service import classify_emotion
from chat.services.llm_chat_service import (
    build_messages,
    get_empathetic_response,
    get_empathetic_response_stream,
    get_smart_action,
)
from chat.models import ChatMessage, AIPrompt
from chat.graph.state import ChatState

logger = logging.getLogger("exhale")


def should_ask_question(state: ChatState) -> bool:
    return state.get("last_question") is None


def _extract_last_question(text: str | None) -> str | None:
    if not text:
        return None
    matches = re.findall(r"([^?]*\?)", text)
    if not matches:
        return None
    return matches[-1].strip()


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


from langchain_core.runnables.config import RunnableConfig

def respond_node(state: ChatState, config: RunnableConfig) -> ChatState:
    from chat.exceptions import LLMAPIError

    history = (
        ChatMessage.objects.filter(
            conversation_id=state["conversation_id"]
        )
        .order_by("timestamp")
        .only("role", "content")
    )

    can_ask_question = should_ask_question(state)

    messages = build_messages(
        current_text=state["text"],
        emotion=state["emotion"],
        history=list(history),
        history_limit=6,
        context=state.get("context", []),
        stage=state.get("stage", "general"),
        is_crisis=state["is_crisis"],
        user_nickname=state.get("user_nickname"),
        user_age=state.get("user_age"),
        user_topics=state.get("user_topics"),
        can_ask_question=can_ask_question,
    )

    stream_queue = config.get("configurable", {}).get("stream_queue")

    if state["is_crisis"]:
        try:
            if stream_queue:
                state["ai_response"] = get_empathetic_response_stream(messages, stream_queue)
            else:
                state["ai_response"] = get_empathetic_response(messages)
        except Exception as e:
            logger.error("LLM crisis response failed: %s", str(e))
            fallback = AIPrompt.objects.filter(name="crisis_fallback").first()
            state["ai_response"] = fallback.content if fallback else "Please contact a helpline immediately."
        state["smart_action"] = None
        return state

    try:
        if stream_queue:
            state["ai_response"] = get_empathetic_response_stream(messages, stream_queue)
        else:
            state["ai_response"] = get_empathetic_response(messages)
    except LLMAPIError:
        raise

    if can_ask_question:
        state["last_question"] = _extract_last_question(state.get("ai_response"))

    state["smart_action"] = get_smart_action(state["emotion"])
    return state
