from chat.graph.state import ChatState


def route_after_crisis(state: ChatState) -> str:
    """Skip emotion detection entirely if crisis detected."""
    if state["is_crisis"]:
        return "respond"
    return "detect_emotion"


def route_after_detection(state: ChatState) -> str:
    """Always go to retrieve_context after emotion is set."""
    return "retrieve_context"