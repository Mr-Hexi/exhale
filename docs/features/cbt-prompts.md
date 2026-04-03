# CBT Follow-Up Prompts

## Status
Temporarily disabled as of 2026-04-04.

## What it does
This feature previously appended a short CBT-style reflection question after
some assistant responses.

Current behavior: no CBT follow-up message is appended for new messages.

## How it works
`SendMessageView` now sets `cbt_prompt` to `null` and does not create a second
assistant message for CBT follow-up.

The frontend no longer appends any `cbt_prompt` bubble from streamed response
completion.

## API endpoints used
- `POST /api/chat/<id>/send/` - response includes `cbt_prompt`, currently `null`

## Key files
- `backend/chat/views.py` - `SendMessageView` (`cbt_prompt` disabled for now)
- `frontend/src/hooks/useChat.js` - no `cbt_prompt` append handling

## Edge cases handled
- `cbt_prompt` is always `null` for new responses.
- Existing historical CBT follow-up messages (already persisted) remain in chat history.

## Logging
- No CBT follow-up send logging is emitted while disabled.

## Known limitations
- This doc reflects temporary behavior. Re-enable details should be restored if CBT follow-ups are enabled again.
