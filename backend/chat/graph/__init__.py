import os
import threading
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from chat.graph.state import ChatState
from chat.graph.nodes import (
    crisis_check_node,
    detect_emotion_node,
    retrieve_context_node,
    respond_node,
)
from chat.graph.edges import route_after_crisis, route_after_detection

# ── Build graph ──────────────────────────────────────────────
builder = StateGraph(ChatState)

builder.add_node("crisis_check",     crisis_check_node)
builder.add_node("detect_emotion",   detect_emotion_node)
builder.add_node("retrieve_context", retrieve_context_node)
builder.add_node("respond",          respond_node)

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

# ── Checkpointer (scopes history per conversation thread) ────
import psycopg

DATABASE_URL = os.getenv("DATABASE_URL")
_graph_lock = threading.Lock()
_connection = None
_checkpointer = None
chat_graph = None


def _build_graph():
    global _connection, _checkpointer, chat_graph

    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not configured")

    if _connection is not None and getattr(_connection, "closed", False):
        try:
            _connection.close()
        except Exception:
            pass
        _connection = None
        _checkpointer = None
        chat_graph = None

    if chat_graph is not None and _connection is not None:
        return chat_graph

    _connection = psycopg.connect(DATABASE_URL, autocommit=True)
    _checkpointer = PostgresSaver(_connection)
    _checkpointer.setup()
    chat_graph = builder.compile(checkpointer=_checkpointer)
    return chat_graph


def get_chat_graph():
    with _graph_lock:
        return _build_graph()


chat_graph = get_chat_graph()
