# CBT Follow-Up Prompts

## What it does
After the AI responds to a sad or anxious message, it appends a short
cognitive-behavioural therapy (CBT)-style reflection question to gently
encourage the user to examine the root of their feeling.

## How it works
After the main AI response is saved, `SendMessageView` checks the last 3
assistant messages in the current conversation. If none of them match a known
CBT prompt string, it creates a second assistant `ChatMessage` with the
follow-up text and returns it under the `cbt_prompt` key.

The frontend renders it as a distinct "Reflection" bubble (indigo, italic)
so users can visually distinguish it from the main AI response.

## API endpoints used
- `POST /api/chat/<id>/send/` — response now includes `cbt_prompt: { content } | null`

## Key files
- `prompts/v1.py` — `CBT_FOLLOW_UPS` dict
- `chat/services/llm_chat_service.py` — `get_cbt_followup()`
- `chat/views.py` — `SendMessageView` (append logic)
- `frontend/src/hooks/useChat.js` — `cbtPrompt` state
- `frontend/src/pages/ChatPage.jsx` — Reflection bubble render

## Edge cases handled
- Only triggers on first occurrence — recent history checked before sending
- Returns `null` for happy and angry — no CBT prompt shown
- CBT message is a full `ChatMessage` record — appears in history on reload
- Crisis path always returns `cbt_prompt: null`

## Logging
- INFO logged when CBT follow-up is sent (user id, emotion)

## Known limitations
- "Recent" is defined as last 3 assistant messages — not time-based
- Does not detect paraphrased re-asks of the same CBT question