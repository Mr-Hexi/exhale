import logging
import re
from emotion.services.emotion_service import classify_emotion
from chat.services.llm_chat_service import (
    build_messages,
    enforce_response_policy,
    get_empathetic_response,
    get_empathetic_response_stream,
    get_smart_action,
    is_existential_question,
    is_deep_stage,
    parse_response_policy,
)
from chat.models import ChatMessage, AIPrompt
from chat.graph.state import ChatState

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
        "mental fatigue",
        "mentally tired",
        "hard to focus",
        "small tasks feel heavy",
        "even small tasks",
        "everything feels heavy",
    ),
    "hopelessness": (
        "hopeless", "stuck", "no point", "nothing will change", "can't go on",
        "what's the point", "whats the point", "what is the point", "why bother", "why try"
    ),
    "self_doubt": (
        "not good enough", "self doubt", "self-doubt", "imposter", "fear of judgment", "judge me"
    ),
}


def should_ask_question(state: ChatState) -> bool:
    if is_deep_stage(state.get("stage")):
        return False
    if is_existential_question(state.get("text")):
        return False
    return state.get("last_question") is None


def _extract_last_question(text: str | None) -> str | None:
    if not text:
        return None
    matches = re.findall(r"([^?]*\?)", text)
    if not matches:
        return None
    return matches[-1].strip()


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


def _limit_response_sentences(response: str | None, sentence_limit: int = 4) -> str | None:
    if not response:
        return response

    sentences = re.split(r"(?<=[.!?]) +", response.strip())
    if len(sentences) <= sentence_limit:
        return response.strip()

    return " ".join(sentences[:sentence_limit]).strip()


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
    state["confidence"] = result.get("confidence", result.get("emotion_confidence", 1.0))
    state["is_crisis"] = result.get("is_crisis", False)
    model_stage = (result.get("stage") or "").lower() or None
    heuristic_stage = _detect_stage(state["text"], state["emotion"])

    # Prefer heuristic deep-stage signals when model stage is absent or shallow.
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
        stage=state.get("stage", "general"),
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

    user_history_texts = [msg.content for msg in history if msg.role == "user"]
    response_policy = parse_response_policy(state.get("text"), user_history_texts)
    state["response_policy"] = response_policy

    can_ask_question = should_ask_question(state) and not response_policy.get("no_question", False)
    force_answer = is_existential_question(state.get("text"))
    needs_insight = state.get("stage") in ["hopelessness", "burnout", "self_doubt"]

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
        force_answer=force_answer,
        needs_insight=needs_insight,
        response_policy=response_policy,
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
        state["ai_response"] = _limit_response_sentences(state.get("ai_response"))
        state["ai_response"] = enforce_response_policy(state.get("ai_response"), response_policy)
        state["smart_action"] = None
        return state

    try:
        if stream_queue:
            state["ai_response"] = get_empathetic_response_stream(messages, stream_queue)
        else:
            state["ai_response"] = get_empathetic_response(messages)
    except LLMAPIError:
        raise
    state["ai_response"] = _limit_response_sentences(state.get("ai_response"))
    state["ai_response"] = enforce_response_policy(state.get("ai_response"), response_policy)

    if can_ask_question:
        state["last_question"] = _extract_last_question(state.get("ai_response"))

    if response_policy.get("no_extra_prompt"):
        state["smart_action"] = None
    elif state.get("stage") in ["hopelessness", "burnout"]:
        state["smart_action"] = None
    elif force_answer:
        state["smart_action"] = None
    else:
        state["smart_action"] = get_smart_action(state["emotion"])
    return state
