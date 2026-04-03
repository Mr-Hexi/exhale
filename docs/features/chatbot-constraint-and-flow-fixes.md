# Chatbot Constraint and Flow Fixes

## Why this document exists
During real conversational testing, we found that the bot behaved correctly only when users wrote explicit constraint-heavy prompts. This document summarizes the root causes and the fixes we shipped.

## Problems we observed
1. Constraint-only compliance:
- The bot followed rules like "no question" only in the same message, but not reliably in follow-up turns.

2. Extra follow-up prompt leakage:
- Even when the main response behaved correctly, a second CBT/helper prompt could still appear.

3. Deep-state miss in natural language:
- Messages like "even small tasks feel heavy" were sometimes treated as general, so the bot still asked probing questions.

## Root causes
1. No persistent response policy:
- Constraints were not extracted from conversation history and reapplied centrally each turn.

2. CBT follow-up logic was too broad:
- It triggered primarily from emotion checks and duplicate checks, without enough guardrails for deep/existential states and user preference.

3. Stage arbitration trusted shallow stage values:
- If classifier stage came as general, heuristics were not always given priority for deep burnout/hopelessness phrasing.

## What we changed
1. Added persistent response policy parsing:
- Implemented `parse_response_policy(...)` in `backend/chat/services/llm_chat_service.py`.
- Policy fields:
  - `no_question`
  - `no_extra_prompt`
  - `max_sentences`
- Policy is computed from recent user turns plus current input (latest directive wins).

2. Enforced policy in both prompt and output:
- `build_messages(...)` now receives `response_policy` and injects policy system instructions.
- `enforce_response_policy(...)` post-processes output to:
  - remove question marks when `no_question` is active
  - cap sentence count when `max_sentences` is set

3. Wired policy into graph state/runtime:
- `respond_node(...)` now stores and uses `state["response_policy"]`.
- `can_ask_question` now respects stage/existential checks and policy flags.
- `smart_action` is suppressed when `no_extra_prompt` is active.

4. Tightened CBT follow-up gating:
- Added/updated `should_send_cbt_followup(...)` checks for:
  - crisis
  - non-sad/non-anxious
  - deep stages
  - existential text
  - `response_policy.no_extra_prompt`
- Applied this in `SendMessageView`.

5. Improved deep-stage detection for natural phrasing:
- Extended burnout keyword coverage in `backend/chat/graph/nodes.py` with phrases like:
  - "mentally tired"
  - "hard to focus"
  - "small tasks feel heavy"
  - "even small tasks"
- Added stage arbitration rule:
  - deep heuristic stage overrides shallow model stage when they conflict.

## Files changed
- `backend/chat/services/llm_chat_service.py`
- `backend/chat/graph/nodes.py`
- `backend/chat/graph/state.py`
- `backend/chat/views.py`
- `backend/chat/tests.py`
- `docs/chatbot-flow-detailed.md`

## Test coverage added
1. Policy parsing and enforcement tests.
2. CBT follow-up suppression test when `no_extra_prompt` is set.
3. Stage detection tests for human burnout phrasing.
4. Deep-stage heuristic override regression test.

## Real-chat result after fixes
For messages like "even small tasks feel heavy lately," the bot now stays supportive without automatically appending a probing follow-up question or helper prompt in deep-state flows.

## Remaining known limitations
1. Emotion model is still 4-class by project requirement (`sad`, `angry`, `anxious`, `happy`).
2. `max_sentences` parser currently supports practical short patterns (digits and one-five words).
3. Full Django test suite execution still depends on local env dependencies.
