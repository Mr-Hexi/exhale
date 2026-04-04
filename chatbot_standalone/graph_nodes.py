"""Standalone LangGraph nodes extracted from backend chatbot flow."""

from __future__ import annotations

from core_logic import (
    build_messages,
    check_crisis,
    classify_emotion,
    detect_stage,
    should_exit_crisis,
)
from graph_state import ChatState
from llm_client import LLMClient
from rag_retrieval import retrieve


def crisis_check_node(state: ChatState) -> ChatState:
    """Node 1: detect crisis language and seed crisis defaults.

    Args:
        state: Mutable graph state containing current user text.

    Returns:
        ChatState: Updated state. Sets `is_crisis`; in crisis mode also sets
            conservative defaults (`emotion='sad'`, `confidence=1.0`).
    """
    
    previous = state.get("is_crisis", False)
    current = check_crisis(state["text"])
    wants_exit = should_exit_crisis(state["text"])

    state["previous_is_crisis"] = previous
    # Stay in crisis mode until an explicit safe-exit signal is detected,
    # unless the current message still contains crisis language.
    state["is_crisis"] = current or (previous and not wants_exit)

    if state["is_crisis"]:
        state["emotion"] = "sad"
        state["confidence"] = 1.0
    return state


def detect_emotion_node(state: ChatState, *, client: LLMClient) -> ChatState:
    """Node 2: classify emotion and infer stage.

    Args:
        state: Mutable graph state with current user text.
        client: Shared LLM client.

    Returns:
        ChatState: Updated state with `emotion`, `confidence`, and `stage`.
    """
    emotion, confidence = classify_emotion(client, state["text"])
    state["emotion"] = emotion
    state["confidence"] = confidence
    state["stage"] = detect_stage(state["text"], emotion)
    return state


def retrieve_context_node(state: ChatState) -> ChatState:
    """Node 3: run RAG retrieval from knowledge DB.

    Args:
        state: Mutable graph state containing text + inferred emotion/stage.

    Returns:
        ChatState: Updated state with `context` list for prompt injection.
    """
    state["context"] = retrieve(
        query_text=state["text"],
        emotion=state["emotion"] or "sad",
        stage=state.get("stage") or "general",
        top_k=3,
        is_crisis=state["is_crisis"],
    )
    return state


def respond_node(state: ChatState, *, client: LLMClient) -> ChatState:
    """Node 4: generate final assistant reply.

    Steps:
    1. Parse user directives into response policy.
    2. Build complete prompt/message stack.
    3. Call LLM completion endpoint.
    4. Enforce deterministic response policy constraints.

    Args:
        state: Mutable graph state with history and context.
        client: Shared LLM client.

    Returns:
        ChatState: Updated state with `response_policy` and `ai_response`.
    """
    # response_policy = parse_response_policy(state.get("text"), state.get("user_history_texts"))
    # state["response_policy"] = response_policy

    is_crisis = state["is_crisis"]

    messages = build_messages(
        current_text=state["text"],
        emotion=state["emotion"] or "sad",
        stage=state.get("stage") or "general",
        history=state.get("history", []),
        is_crisis=is_crisis,
        context=state.get("context", []),
    )

    response = client.completion(messages)

    # # 🔥 CRITICAL: enforce safety after LLM
    if is_crisis:
        from utility.safety import enforce_crisis_safety
        response = enforce_crisis_safety(response)

    state["ai_response"] = response
    return state
