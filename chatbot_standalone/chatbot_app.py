"""Standalone CLI chatbot app that runs through LangGraph + local RAG."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from langgraph_pipeline import build_chat_graph
from llm_client import LLMClient


def load_environment() -> None:
    """Load project environment variables for standalone runtime.

    Returns:
        None. Side effect: adds keys from `backend/.env` to process environment.
    """
    root = Path(__file__).resolve().parents[1]
    env_path = root / "backend" / ".env"
    load_dotenv(env_path, override=False)


def main() -> None:
    """Run interactive chatbot REPL loop.

    Flow:
    1. Load env and initialize shared clients.
    2. Read user input in a loop.
    3. Build graph state and execute one graph pass.
    4. Persist turn history for context in future turns.
    5. Print assistant response + debug metadata.

    Returns:
        None.
    """
    load_environment()
    client = LLMClient.from_env()
    graph = build_chat_graph(client)
    history: list[dict[str, str]] = []
    user_history_texts: list[str] = []
    current_is_crisis = False

    print("Exhale standalone chatbot")
    print("Type '/exit' to quit.")

    while True:
        user_text = input("\nYou: ").strip()
        # Ignore blank lines to keep console experience clean.
        if not user_text:
            continue
        if user_text.lower() in {"/exit", "exit", "quit"}:
            print("Bye.")
            break

        # State schema mirrors graph_state.ChatState so each node has context.
        state = {
            "text": user_text,
            "emotion": None,
            "stage": "general",
            "confidence": None,
            "is_crisis": current_is_crisis,
            "context": [],
            "ai_response": None,
            "history": history,
            "user_history_texts": user_history_texts,
            "response_policy": None,
        }
        # Execute one complete pipeline pass:
        # crisis_check -> detect_emotion -> retrieve_context -> respond.
        result = graph.invoke(state)

        reply = result.get("ai_response", "")
        emotion = result.get("emotion", "sad")
        stage = result.get("stage", "general")
        is_crisis = result.get("is_crisis", False)
        rag_context = result.get("context", [])
        current_is_crisis = is_crisis
        confidence = result.get("confidence", None)

        # Persist turn messages so future prompts retain short-term memory.
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": reply})
        user_history_texts.append(user_text)

        print(f"Bot: {reply}")
        print(f"[debug] emotion={emotion}, stage={stage}, crisis={is_crisis}, confidence={confidence}")
        if rag_context:
            print("[debug] rag_context:")
            for item in rag_context:
                print(f"  - {item}")


if __name__ == "__main__":
    main()
