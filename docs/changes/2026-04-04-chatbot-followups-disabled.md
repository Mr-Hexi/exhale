# Chatbot: Temporarily Disable CBT Follow-Ups and Smart Action Pills

Date: 2026-04-04

## What changed

### 1) Disabled smart action payloads in chatbot response flow
- File: `backend/chat/graph/nodes.py`
- `respond_node(...)` now always sets `state["smart_action"] = None`.

### 2) Disabled CBT follow-up message creation
- File: `backend/chat/views.py`
- Removed CBT follow-up append logic in `SendMessageView`.
- API continues returning `cbt_prompt`, but it is now always `null`.

### 3) Frontend no longer appends CBT follow-up from stream completion
- File: `frontend/src/hooks/useChat.js`
- Removed handling that injected `cbt_prompt` as a second assistant message.
- Smart action state is forced to `null` on completion.

## Why this was changed
- Current chatbot UX should focus on a single direct assistant reply per user message.
- The extra CBT reflection question and smart action pills were adding unwanted follow-up noise in the UI.

## Outcome
- New chat turns no longer show:
  - CBT follow-up reflection bubble
  - Smart action pill
- Existing historical messages already stored in the database are unchanged.
