from typing import TypedDict


class ChatState(TypedDict):
    text: str
    emotion: str | None
    confidence: float | None
    is_crisis: bool
    context: list[str]       # RAG chunks — empty until knowledge base is built
    ai_response: str | None
    smart_action: dict | None
    conversation_id: int     # used to scope history in respond node
    user_id: int             # used for logging