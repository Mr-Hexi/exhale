from typing import TypedDict


class ChatState(TypedDict):
    text: str
    emotion: str | None
    stage: str | None
    confidence: float | None
    is_crisis: bool
    previous_is_crisis: bool | None
    context: list[str]  # RAG chunks, empty until knowledge base is built
    ai_response: str | None
    conversation_id: int  # used to scope history in respond node
    user_id: int  # used for logging
    user_nickname: str | None
    user_age: str | None
    user_topics: list[str] | None
