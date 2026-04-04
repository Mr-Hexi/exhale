"""Standalone LangGraph pipeline for Exhale chatbot."""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from graph_edges import route_after_crisis, route_after_detection
from graph_nodes import crisis_check_node, detect_emotion_node, respond_node, retrieve_context_node
from graph_state import ChatState
from llm_client import LLMClient


def build_chat_graph(client: LLMClient):
    """Build and compile the chatbot execution graph.

    Args:
        client: Shared LLM client injected into generation-related nodes.

    Returns:
        CompiledStateGraph: Executable LangGraph object supporting `.invoke(state)`.
    """
    builder = StateGraph(ChatState)

    # Nodes represent isolated steps in the chatbot decision pipeline.
    builder.add_node("crisis_check", crisis_check_node)
    # Lambdas close over `client` so nodes can remain pure-state signatures.
    builder.add_node("detect_emotion", lambda state: detect_emotion_node(state, client=client))
    builder.add_node("retrieve_context", retrieve_context_node)
    builder.add_node("respond", lambda state: respond_node(state, client=client))

    # Entry point and routing mirror backend graph behavior.
    builder.set_entry_point("crisis_check")
    builder.add_conditional_edges(
        "crisis_check",
        route_after_crisis,
        {"respond": "respond", "detect_emotion": "detect_emotion"},
    )
    builder.add_conditional_edges(
        "detect_emotion",
        route_after_detection,
        {"retrieve_context": "retrieve_context"},
    )
    builder.add_edge("retrieve_context", "respond")
    builder.add_edge("respond", END)

    return builder.compile()
