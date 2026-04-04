"""Conditional edge routing for standalone LangGraph chatbot."""

from graph_state import ChatState


def route_after_crisis(state: ChatState) -> str:
    """Choose next node after crisis check.

    Args:
        state: Current graph state with `is_crisis` already set.

    Returns:
        str: `respond` for crisis, otherwise `detect_emotion`.
    """
    if state["is_crisis"]:
        return "respond"
    return "detect_emotion"


def route_after_detection(state: ChatState) -> str:
    """Choose next node after emotion detection.

    Args:
        state: Current graph state after emotion/stage inference.

    Returns:
        str: Always `retrieve_context` in this pipeline.
    """
    return "retrieve_context"
