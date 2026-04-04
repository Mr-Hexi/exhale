# Standalone Chatbot (LangGraph + DB RAG)

This folder is a standalone, learning-friendly extraction of your chatbot flow.
It now includes:

- LangGraph orchestration
- database-backed RAG retrieval using your project `DATABASE_URL`
- OpenAI-compatible LLM client

It is intentionally independent from Django views/models, but it connects to the
same knowledge table used by the main project.

## Architecture

- `chatbot_app.py`
  - CLI entrypoint.
  - Loads env, builds graph, invokes graph for each user message.
  - Prints debug state (`emotion`, `stage`, `crisis`, `rag_context`).

- `langgraph_pipeline.py`
  - Builds `StateGraph(ChatState)` and compiles it.
  - Route:
    - `crisis_check -> respond` (if crisis)
    - `crisis_check -> detect_emotion -> retrieve_context -> respond` (normal flow)

- `graph_state.py`
  - Typed state schema shared by all nodes.

- `graph_edges.py`
  - Conditional edge routing logic.

- `graph_nodes.py`
  - Node implementations:
    - `crisis_check_node`
    - `detect_emotion_node`
    - `retrieve_context_node`
    - `respond_node`

- `core_logic.py`
  - Prompt + behavior utilities:
    - crisis detection
    - emotion classification
    - stage detection
    - response policy parsing
    - message assembly
    - response post-processing

- `rag_retrieval.py`
  - Connects to PostgreSQL using `DATABASE_URL`.
  - Reads from `knowledge_knowledgechunk`.
  - Scores chunks using:
    - semantic similarity (embedding cosine)
    - emotion bonus
    - stage bonus
    - diversity filter

- `llm_client.py`
  - Provider/model setup from env.
  - Supports `openrouter`, `groq`, `gemini`, `llmapi`.
  - Sends chat completion requests.

- `prompts.py`
  - Base and specialized prompt blocks used by `core_logic.build_messages(...)`.

## LangGraph files (complete)

This is the exact LangGraph code surface in this standalone app.

### 1) `langgraph_pipeline.py`

- Function: `build_chat_graph(client)`
- Creates: `StateGraph(ChatState)`
- Registers nodes:
  - `crisis_check`
  - `detect_emotion`
  - `retrieve_context`
  - `respond`
- Registers routing:
  - `crisis_check -> route_after_crisis(...)`
  - `detect_emotion -> route_after_detection(...)`
- Terminates:
  - `retrieve_context -> respond -> END`

### 2) `graph_state.py`

- Defines `ChatState` (TypedDict) used by LangGraph.
- Keys:
  - `text`
  - `emotion`
  - `stage`
  - `confidence`
  - `is_crisis`
  - `context`
  - `ai_response`
  - `history`
  - `user_history_texts`
  - `response_policy`

### 3) `graph_edges.py`

- Function: `route_after_crisis(state)`
  - reads: `state["is_crisis"]`
  - returns: `"respond"` or `"detect_emotion"`

- Function: `route_after_detection(state)`
  - returns: `"retrieve_context"` (always)

### 4) `graph_nodes.py`

- `crisis_check_node(state)`
  - reads: `text`
  - writes: `is_crisis`, `emotion`, `confidence`

- `detect_emotion_node(state, client)`
  - reads: `text`
  - writes: `emotion`, `confidence`, `stage`

- `retrieve_context_node(state)`
  - reads: `text`, `emotion`, `stage`, `is_crisis`
  - writes: `context`

- `respond_node(state, client)`
  - reads: `text`, `emotion`, `stage`, `history`, `context`, `user_history_texts`, `is_crisis`
  - writes: `response_policy`, `ai_response`

### Graph execution map

```text
ENTRY
  -> crisis_check_node
      -> route_after_crisis
          -> respond_node ---------------------> END         (crisis)
          -> detect_emotion_node
               -> route_after_detection
                    -> retrieve_context_node
                         -> respond_node -------> END         (non-crisis)
```

### Minimal invoke contract

`chatbot_app.py` must pass all required state keys when calling:

```python
result = graph.invoke(state)
```

Required initial keys:

- `text`, `emotion`, `stage`, `confidence`, `is_crisis`
- `context`, `ai_response`
- `history`, `user_history_texts`
- `response_policy`

## End-to-end runtime flow

For each user input:

1. `chatbot_app.main()` builds graph and sends state to `graph.invoke(state)`.
2. `crisis_check_node` flags crisis intent if risky language is found.
3. If non-crisis:
   - `detect_emotion_node` calls LLM emotion classification and stage detection.
   - `retrieve_context_node` performs DB RAG retrieval from `knowledge_knowledgechunk`.
4. `respond_node`:
   - parses user response policy
   - builds prompt stack (`system + context + policy + history + user turn`)
   - calls the LLM
   - enforces policy constraints (sentence cap/no question)
5. CLI prints answer and debug metadata.

## Exact function call order (what runs first, next, then next)

This section is the precise execution sequence across files.

### A) Startup sequence (runs once)

1. `chatbot_app.py -> main()`
2. `chatbot_app.py -> load_environment()`
3. `llm_client.py -> LLMClient.from_env()`
4. `langgraph_pipeline.py -> build_chat_graph(client)`
5. `main()` enters the input loop and waits for user text

### B) Per-message sequence (runs on every user message)

1. `chatbot_app.py -> main()` reads `user_text`
2. `main()` builds `state` dictionary
3. `main()` calls `graph.invoke(state)`
4. LangGraph executes `graph_nodes.py -> crisis_check_node(state)`
5. `crisis_check_node` calls `core_logic.py -> check_crisis(text)`
6. LangGraph executes `graph_edges.py -> route_after_crisis(state)`

### C) Branch 1: Crisis path

If `is_crisis=True`, execution is:

1. `graph_nodes.py -> respond_node(state, client)`
2. `respond_node` calls `core_logic.py -> parse_response_policy(...)`
3. `respond_node` calls `core_logic.py -> build_messages(...)`
4. Inside `build_messages(...)`:
   - uses `CRISIS_SYSTEM_PROMPT` from `prompts.py`
   - may call `is_existential_question(...)` for extra handling logic
5. `respond_node` calls `llm_client.py -> LLMClient.completion(messages)`
6. `respond_node` calls `core_logic.py -> enforce_response_policy(...)`
7. control returns to `chatbot_app.py -> main()` and prints output/debug

### D) Branch 2: Normal path (non-crisis)

If `is_crisis=False`, execution is:

1. `graph_nodes.py -> detect_emotion_node(state, client)`
2. `detect_emotion_node` calls `core_logic.py -> classify_emotion(client, text)`
3. `classify_emotion` calls `llm_client.py -> LLMClient.completion(messages)` (classification prompt)
4. `detect_emotion_node` calls `core_logic.py -> detect_stage(text, emotion)`
5. LangGraph executes `graph_edges.py -> route_after_detection(state)`
6. `graph_nodes.py -> retrieve_context_node(state)`
7. `retrieve_context_node` calls `rag_retrieval.py -> retrieve(...)`

Inside `rag_retrieval.retrieve(...)`, order is:
1. `_fetch_chunks_from_db(is_crisis=False)`
2. `_resolve_stage(stage, query_text)`
3. `_embed_text(query_text)` (if embeddings available)
4. For each chunk:
   - `_cosine_similarity(...)` or `_keyword_score(...)`
   - `_emotion_bonus(...)`
   - `_stage_bonus(...)`
5. sort + diversity filter via `_is_duplicate_embedding(...)`
6. label formatting via `_label_for_chunk(...)`
7. returns top `context` lines to `retrieve_context_node`

Then graph continues:
1. `graph_nodes.py -> respond_node(state, client)`
2. `respond_node` calls `core_logic.py -> parse_response_policy(...)`
3. `respond_node` calls `core_logic.py -> build_messages(...)`

Inside `build_messages(...)`, order is:
1. choose base/system prompt (`prompts.py`)
2. append emotion prompt (`EMOTION_PROMPTS[...]`)
3. append stage prompt (`STAGE_PROMPTS[...]`)
4. `_format_context_block(context)` injects RAG context
5. optionally apply question-handling (`is_existential_question(...)`)
6. append policy instructions
7. append short history
8. append current user message

Then:
1. `respond_node` calls `llm_client.py -> LLMClient.completion(messages)` (final response generation)
2. `respond_node` calls `core_logic.py -> enforce_response_policy(...)`
3. control returns to `chatbot_app.py -> main()` and prints output/debug

### E) End of each turn

Back in `chatbot_app.py -> main()`:

1. assistant reply is added to `history`
2. user text is added to `user_history_texts`
3. next input turn starts

## Database-backed RAG details

`rag_retrieval.retrieve(...)` does this:

1. Reads chunks from DB:
   - crisis mode => `category = 'crisis_resource'`
   - normal mode => all non-crisis rows
2. Embeds query text with `all-MiniLM-L6-v2` (if available).
3. Computes score per chunk:
   - `semantic_similarity`
   - `+ emotion_bonus`
   - `+ stage_bonus`
4. Sorts by score, filters near-duplicates, returns top `k`.
5. Converts category to readable labels (`Insight`, `Technique`, `Question`, etc.).

Returned chunks are injected into the LLM prompt as a `CONTEXT BLOCK`.

## Function-by-function guide

### `chatbot_app.py`

- `load_environment()`
  - Loads `backend/.env` so this app uses the same project settings.

- `main()`
  - Interactive loop.
  - Builds state and invokes graph per turn.
  - Stores conversation history for multi-turn continuity.

### `langgraph_pipeline.py`

- `build_chat_graph(client)`
  - Registers nodes and conditional edges.
  - Returns compiled graph ready for `.invoke(...)`.

### `graph_edges.py`

- `route_after_crisis(state)`
  - If crisis: skip emotion + retrieval and go directly to response.

- `route_after_detection(state)`
  - Normal flow always moves to retrieval.

### `graph_nodes.py`

- `crisis_check_node(state)`
  - Calls `check_crisis` and sets flags (`is_crisis`, `emotion`, `confidence`).

- `detect_emotion_node(state, client)`
  - Calls LLM emotion classification.
  - Derives stage (`burnout`, `hopelessness`, `self_doubt`, `general`).

- `retrieve_context_node(state)`
  - Calls `rag_retrieval.retrieve(...)` and stores prompt-ready context lines.

- `respond_node(state, client)`
  - Applies response policy extraction.
  - Builds final messages and calls LLM.
  - Enforces output constraints.

### `core_logic.py`

- `check_crisis(text)`
  - Keyword-based crisis detector.

- `is_existential_question(text)`
  - Detects existential phrasing to force direct answering style.

- `detect_stage(text, emotion)`
  - Stage classifier using heuristics/keywords.

- `parse_response_policy(current_text, user_history_texts)`
  - Extracts user constraints (`no_question`, `max_sentences`, `no_extra_prompt`).

- `enforce_response_policy(response, response_policy)`
  - Post-processes model output to honor constraints.

- `classify_emotion(client, text)`
  - Uses LLM prompt to return a strict emotion label.

- `_format_context_block(context)`
  - Converts retrieved context into clean bullet format for system prompt.

- `build_messages(...)`
  - Creates final chat message list for LLM API.

### `rag_retrieval.py`

- `_fetch_chunks_from_db(is_crisis)`
  - Opens DB connection via `psycopg2`.
  - Reads chunk rows from `knowledge_knowledgechunk`.

- `_parse_embedding(raw_value)`
  - Converts pgvector textual/list output into Python float vectors.

- `_embed_text(text)`
  - Generates query embedding (when sentence-transformers is available).

- `_emotion_bonus(...)`, `_stage_bonus(...)`
  - Adds relevance scoring boosts.

- `_is_duplicate_embedding(...)`
  - Prevents repeated/near-identical chunks in top-k.

- `retrieve(...)`
  - Main retrieval entrypoint used by graph node.

### `llm_client.py`

- `LLMClient.from_env()`
  - Validates provider/model/env keys and creates configured OpenAI client.

- `LLMClient.completion(...)`
  - Executes chat completion and returns trimmed text.

## Required environment variables

Loaded from `backend/.env`:

- `DATABASE_URL` (must point to your project PostgreSQL DB)
- `LLM_PROVIDER`
- `LLM_MODEL`
- provider API key:
  - `OPENROUTER_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY` / `LLMAPI_API_KEY`

## Run

From repository root:

```powershell
python chatbot_standalone/chatbot_app.py
```

Exit with `/exit` (or `exit`, `quit`).

## Notes

- If DB connection fails or knowledge table is empty, RAG context may come back empty.
- If sentence-transformers is unavailable, retrieval falls back to lexical overlap scoring.
