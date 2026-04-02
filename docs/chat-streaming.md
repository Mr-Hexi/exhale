# Chatbot Streaming Architecture

## Overview
We've successfully implemented **Real-Time Token Streaming** for the Exhale AI Chatbot. Instead of waiting for the LLM to generate the entire response (which causes long loading spinners), the response now appears piece-by-piece in real time, drastically improving the perceived performance and user experience.

## Why This Was Challenging
The application uses **LangGraph** (`chat_graph`) hooked up to standard **Django Synchronous Views** (`APIView`) and relies on `psycopg` to checkpoint state execution synchronously. 
LangGraph's `.invoke()` function blocks execution entirely until every node is fully completed (meaning it waits for the entire LLM to finish running). Django's `APIView` normally expects a single, complete response to be returned at the end of execution.

Simply enabling `stream=True` on the OpenAI execution was not enough, because the graph architecture and Django's sync request-response cycle had nowhere to pass the intermediate streaming tokens.

## How We Solved It

We engineered a **Background Threading + Server-Sent Events (SSE)** pipeline to bridge the synchronous LangGraph with real-time browser streams.

### 1. The Queue mechanism (Backend State)
Instead of forcing the LangGraph to stream its internal states (which breaks strict synchronous database checkpointers), we injected a Python `queue.Queue` directly into the `ChatState`.
*   **File:** `backend/chat/graph/state.py`
    *   Added `stream_queue: Any` to the typed state dictionary.

### 2. Streaming LLM Execution (Backend Services)
We created identical streaming implementations of all primary LLM chat services.
*   **File:** `backend/services/llm_client.py` 
    *   Added `get_completion_stream()` to fire standard `yield` chunks from the `OpenAI.chat.completions.create(stream=True)`.
*   **File:** `backend/chat/services/llm_chat_service.py`
    *   Added `get_empathetic_response_stream(messages, queue)` which continuously pushes chunks to the graph's injected queue natively.
*   **File:** `backend/chat/graph/nodes.py`
    *   Updated the `respond_node` and crisis prompt handling to utilize `stream_queue`. If a stream queue is present, it will run the stream generator seamlessly inside the LangGraph.

### 3. Server-Sent Events Pipeline (Backend View)
*   **File:** `backend/chat/views.py`
    *   We completely refactored `SendMessageView`.
    *   When an API request starts, we initialize `q = queue.Queue()` and immediately spin up a `threading.Thread(target=bg_thread)` to handle `chat_graph.invoke()`. 
    *   The main web thread is freed instantly, establishing a `StreamingHttpResponse` generator. It listens to the `Queue` and rapidly yields `Server-Sent Events` (`f"data: ...\n\n"`).
    *   Once the graph concludes execution and saves the final context to the Database (ChatMessage, MoodLog, CBT Follow-Ups), the background thread emits a `{"type": "done"}` payload, closing the stream gracefully and passing the Database IDs down the pipe.

### 4. Fetch Parser Hook (Frontend UI)
Axios `.post` does not natively support continuous stream buffering gracefully in functional components. We rebuilt the API caller inside React.
*   **File:** `frontend/src/hooks/useChat.js`
    *   Switched to native `fetch()` paired with `.body.getReader()`.
    *   The hook continuously polls `.read()` and converts incoming bytes into strings.
    *   It cleanly splits the raw SSE blocks by `\n` character and merges new UI characters into the state chunk by chunk.
    *   When the stream yields `{"type": "done", "result": ... }`, the UI fully replaces its optimistically updated UI components with exactly matched context from the Backend.

## End Result
A deeply embedded, synchronous Langchain architectural core correctly operating concurrently inside Django, delivering ultra-rapid real-time UI data to the frontend typing interface. Any slow LLM execution feels instantaneous to the user.
