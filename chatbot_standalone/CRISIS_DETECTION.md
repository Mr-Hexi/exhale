# Crisis Detection: Code-Level Guide and Dataflow

## Scope
This document explains how crisis detection works in the standalone chatbot pipeline, including:
- Detection rules
- Crisis persistence/de-escalation logic
- Graph routing behavior
- Response-time safety enforcement
- End-to-end dataflow

## Files Involved
- `core_logic.py`
- `graph_nodes.py`
- `graph_edges.py`
- `langgraph_pipeline.py`
- `utility/safety.py`
- `chatbot_app.py`

## 1) Detection Rules (`core_logic.py`)

### `check_crisis(text: str) -> bool`
Crisis is flagged when either condition is true:

1. Exact/substring keyword match against `CRISIS_KEYWORDS`:
   - Examples: `"kill myself"`, `"suicide"`, `"hurt myself"`, `"thinking of hurting myself"`
2. Soft rule:
   - If text contains `"myself"` and any of `"bad"`, `"hurt"`, `"harm"`

Before keyword/soft checks, explicit negation/recovery phrases are filtered and return `False`, for example:
- `"I don't feel like I'm going to hurt myself anymore"`
- `"I'm not going to hurt myself anymore"`
- `"I won't hurt myself anymore"`
- `"I don't want to hurt myself anymore"`

If neither matches, returns `False`.

### `should_exit_crisis(text: str) -> bool`
De-escalation signal is detected if text includes any `SAFE_EXIT_KEYWORDS`:
- `"i'm okay"`
- `"i am fine"`
- `"feeling better"`

It also matches recovery phrasing patterns such as:
- `"feeling a bit better"` / `"feeling much better"`
- `"I don't feel like I'm going to hurt myself anymore"`
- `"I'm not going to hurt myself anymore"`
- `"I won't hurt myself anymore"`

Returns `True` when a safe-exit phrase appears.

## 2) Crisis State Transition (`graph_nodes.py`)

### `crisis_check_node(state)`
Current logic:

```python
previous = state.get("is_crisis", False)
current = check_crisis(state["text"])
wants_exit = should_exit_crisis(state["text"])

state["previous_is_crisis"] = previous
state["is_crisis"] = current or (previous and not wants_exit)
```

Interpretation:
- Crisis turns ON immediately if current text is crisis (`current=True`).
- If already in crisis, it stays ON unless user sends safe-exit phrase.
- Safe-exit can turn crisis OFF only when there is no new crisis phrase in that same turn.

When `is_crisis=True`, node also sets conservative defaults:
- `emotion = "sad"`
- `confidence = 1.0`

## 3) Routing Behavior (`graph_edges.py`, `langgraph_pipeline.py`)

### After `crisis_check`
`route_after_crisis(state)` chooses:
- `"respond"` when `state["is_crisis"]` is `True`
- `"detect_emotion"` otherwise

This means crisis path skips emotion classification and retrieval.

## 4) Response-Time Crisis Safety (`graph_nodes.py`, `utility/safety.py`)

### In `respond_node`
If `is_crisis=True`, post-process model output with:
- `utility.safety.enforce_crisis_safety(response)`

### `enforce_crisis_safety(text)`
- Removes probing questions if patterns like `"what triggered"`, `"tell me why"` are detected
- Removes intimate words `"sweetheart"` and `"dear"`

Note: current question-removal regex can over-strip and leave awkward punctuation (example: `"I'm here for you, ."`).

## 5) End-to-End Dataflow

```text
User text
  |
  v
chatbot_app.py loop
  - seeds state["is_crisis"] from current_is_crisis (previous turn)
  |
  v
crisis_check_node (graph_nodes.py)
  - check_crisis(text)
  - should_exit_crisis(text)
  - update state.is_crisis
  |
  +--> if is_crisis=True ----------------------------+
  |                                                  |
  |                                           respond_node
  |                                            - build_messages(..., is_crisis=True)
  |                                            - LLM completion
  |                                            - enforce_crisis_safety(...)
  |                                                  |
  |                                                  v
  |                                               ai_response
  |
  +--> if is_crisis=False -> detect_emotion_node -> retrieve_context_node -> respond_node
                               - classify_emotion     - RAG retrieve          - normal response generation
                               - detect_stage
  |
  v
chatbot_app.py loop
  - current_is_crisis = result["is_crisis"] (persist to next turn)
```

## 6) Stateful Example (3 turns)

Initial state: `is_crisis=False`

1. User: `"Sometimes I think I might hurt myself"`
- `check_crisis=True`
- `should_exit_crisis=False`
- New `is_crisis=True`
- Route: direct to `respond` (crisis mode)

2. User: `"I am feeling better now"`
- `check_crisis=False`
- `should_exit_crisis=True`
- New `is_crisis=False`
- Route: non-crisis path (`detect_emotion -> retrieve_context -> respond`)

3. User: `"Actually I want to do something bad to myself"`
- `check_crisis=True`
- `should_exit_crisis=False`
- New `is_crisis=True`
- Route: direct to `respond` (crisis mode)

Alternative de-escalation phrasing now supported:
- User: `"I think I'm feeling a bit better now... I don't feel like I'm going to hurt myself anymore."`
- `check_crisis=False` (negation-aware filter)
- `should_exit_crisis=True`
- If previously in crisis, new `is_crisis=False`

## 7) Worked Example (Code-Level Snapshot)

Input state before `crisis_check_node`:

```python
state = {
    "text": "I think I might hurt myself tonight",
    "is_crisis": False,
    "emotion": None,
    "confidence": None,
    "stage": None,
    "history": [],
    "context": [],
}
```

`crisis_check_node(state)` computes:
- `previous = False`
- `current = check_crisis(text) -> True` (matches keyword/phrase pattern)
- `wants_exit = should_exit_crisis(text) -> False`
- `is_crisis = current or (previous and not wants_exit) -> True`

State after `crisis_check_node`:

```python
{
    "text": "I think I might hurt myself tonight",
    "previous_is_crisis": False,
    "is_crisis": True,
    "emotion": "sad",
    "confidence": 1.0,
    ...
}
```

Routing result:
- `route_after_crisis(state) -> "respond"`

In `respond_node`:
- Builds crisis prompt via `build_messages(..., is_crisis=True)`
- Calls LLM for response
- Applies `enforce_crisis_safety(...)` before final output

Example sanitizer effect:
- Raw model text: `I'm here with you, dear. What triggered this?`
- Final text: `I'm here with you, .`

## 8) Quick Reference
- Detection function: `core_logic.check_crisis`
- Exit function: `core_logic.should_exit_crisis`
- Crisis transition: `graph_nodes.crisis_check_node`
- Crisis router: `graph_edges.route_after_crisis`
- Crisis output sanitizer: `utility.safety.enforce_crisis_safety`
