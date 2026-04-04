import logging

from langchain_core.runnables.config import RunnableConfig

from chat.graph.state import ChatState
from chat.models import AIPrompt, ChatMessage
from chat.services.llm_chat_service import (
    build_messages,
    enforce_crisis_safety,
    get_empathetic_response,
    get_empathetic_response_stream,
)
from emotion.services.emotion_service import classify_emotion

logger = logging.getLogger("exhale")

STAGE_KEYWORDS = {
    "burnout": (
        "burnout",
        "exhausted",
        "drained",
        "tired",
        "overwhelmed",
        "can't keep up",
        "too much",
        "mentally tired",
        "hard to focus",
        "small tasks feel heavy",
        "everything feels heavy",
    ),
    "hopelessness": (
        "hopeless",
        "stuck",
        "no point",
        "nothing will change",
        "can't go on",
        "what's the point",
        "why bother",
        "why try",
    ),
    "self_doubt": (
        "not good enough",
        "self doubt",
        "self-doubt",
        "imposter",
        "fear of judgment",
    ),
}


def _detect_stage(text: str, emotion: str | None) -> str:
    text_lower = text.lower()
    scores = {stage_name: 0 for stage_name in STAGE_KEYWORDS}

    for stage_name, keywords in STAGE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                scores[stage_name] += 1

    best_stage = max(scores, key=scores.get)
    if scores[best_stage] > 0:
        return best_stage

    if emotion == "sad" and any(token in text_lower for token in ("stuck", "can't", "never", "nothing")):
        return "hopelessness"
    return "general"


def crisis_check_node(state: ChatState) -> ChatState:
    from emotion.services.emotion_service import check_crisis, should_exit_crisis

    previous_is_crisis = bool(state.get("is_crisis", False))
    current_is_crisis = check_crisis(state["text"])
    wants_exit = should_exit_crisis(state["text"])

    state["previous_is_crisis"] = previous_is_crisis
    state["is_crisis"] = current_is_crisis or (previous_is_crisis and not wants_exit)

    if state["is_crisis"]:
        if not previous_is_crisis:
            logger.warning("Crisis keyword detected - user_id=%s", state["user_id"])
        state["emotion"] = "sad"
        state["confidence"] = 1.0
    return state


def detect_emotion_node(state: ChatState) -> ChatState:
    result = classify_emotion(state["text"])
    state["emotion"] = result["emotion"]
    state["confidence"] = result.get("confidence", result.get("emotion_confidence", 1.0))
    model_stage = (result.get("stage") or "").lower() or None
    heuristic_stage = _detect_stage(state["text"], state["emotion"])

    if heuristic_stage in {"burnout", "hopelessness"} and model_stage not in {"burnout", "hopelessness"}:
        state["stage"] = heuristic_stage
    else:
        state["stage"] = model_stage or heuristic_stage
    return state


def retrieve_context_node(state: ChatState) -> ChatState:
    from knowledge.services.retrieval import retrieve

    state["context"] = retrieve(
        query_text=state["text"],
        emotion=state["emotion"],
        stage=state.get("stage") or "general",
        top_k=3,
        is_crisis=state["is_crisis"],
    )
    return state


def respond_node(state: ChatState, config: RunnableConfig) -> ChatState:
    from chat.exceptions import LLMAPIError

    history = (
        ChatMessage.objects.filter(conversation_id=state["conversation_id"])
        .order_by("timestamp")
        .only("role", "content")
    )

    messages = build_messages(
        current_text=state["text"],
        emotion=state["emotion"] or "sad",
        history=list(history),
        history_limit=6,
        context=state.get("context", []),
        stage=state.get("stage") or "general",
        is_crisis=state["is_crisis"],
        user_nickname=state.get("user_nickname"),
        user_age=state.get("user_age"),
        user_topics=state.get("user_topics"),
    )

    stream_queue = config.get("configurable", {}).get("stream_queue")

    if state["is_crisis"]:
        try:
            if stream_queue:
                response = get_empathetic_response_stream(messages, stream_queue)
            else:
                response = get_empathetic_response(messages)
        except Exception as error:
            logger.error("LLM crisis response failed: %s", str(error))
            fallback = AIPrompt.objects.filter(name="crisis_fallback").first()
            response = fallback.content if fallback else "Please contact a helpline immediately."

        state["ai_response"] = enforce_crisis_safety(response)
        return state

    try:
        if stream_queue:
            state["ai_response"] = get_empathetic_response_stream(messages, stream_queue)
        else:
            state["ai_response"] = get_empathetic_response(messages)
    except LLMAPIError:
        raise

    return state
