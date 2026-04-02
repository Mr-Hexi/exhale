import os
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
connection = psycopg.connect(DATABASE_URL, autocommit=True)
checkpointer = PostgresSaver(connection)
checkpointer.setup()

chat_graph = builder.compile(checkpointer=checkpointer)