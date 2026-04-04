"""Typed state for standalone LangGraph chatbot pipeline."""

from typing import TypedDict


class ChatState(TypedDict):
    """State object carried through the LangGraph pipeline.

    Each node reads and mutates relevant keys in-place.
    """

    text: str
    emotion: str | None
    stage: str | None
    confidence: float | None
    is_crisis: bool
    prev_crissis: bool | None
    context: list[str]
    ai_response: str | None
    history: list[dict[str, str]]
    user_history_texts: list[str]
    # response_policy: dict | None
