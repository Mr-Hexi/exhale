# Journal-to-Chat Context Flow (Code-Level)

## Feature
“Discuss this journal entry in a new chat” with journal context carried into the conversation prompt.

## 1) Journal button triggers navigation with payload
- In `frontend/src/components/Journal/JournalEntry.jsx`, the `Discuss in chat` button calls `onDiscuss(entry)`.
- In `frontend/src/pages/JournalPage.jsx`, `handleDiscuss(entry)` navigates to `/chat` with route state:
  - `entryId`
  - `content`
  - `emotion`
  - `aiInsight`
  - `createdAt`

## 2) Chat page consumes route state and creates a fresh contextual conversation
- In `frontend/src/pages/ChatPage.jsx`, route state is read:
  - `const initialJournalContext = location.state?.journalContext || null;`
- `useChat({ initialJournalContext })` is called.
- In `frontend/src/hooks/useChat.js`:
  - `buildJournalContextBlock(...)` formats a structured context block.
  - During init, if `initialJournalContext` exists, it creates a new conversation via:
    - `POST /api/chat/conversations/`
    - payload includes:
      - `title: "Journal Reflection"`
      - `journal_context: <formatted context block>`
  - That new conversation is auto-selected.

## 3) Backend stores context on conversation
- In `backend/chat/models.py`, `Conversation` has:
  - `journal_context = models.TextField(blank=True, default="")`
- In `backend/chat/serializers.py`, `journal_context` is included in serializer fields.
- In `backend/chat/views.py` (`ConversationListCreateView.post`), request data is validated and used to create conversations with optional `journal_context`.

## 4) Message send path injects conversation journal context
- In `backend/chat/views.py` (`SendMessageView.post`), graph state includes:
  - `"journal_context": conversation.journal_context`
- In `backend/chat/graph/state.py`, chat state schema includes:
  - `journal_context: str | None`
- In `backend/chat/graph/nodes.py` (`respond_node`), `journal_context` is passed into `build_messages(...)`.

## 5) Prompt builder appends JOURNAL CONTEXT block
- In `backend/chat/services/llm_chat_service.py` (`build_messages`):
  - if `journal_context` exists and not crisis mode, prompt gets:
    - `JOURNAL CONTEXT: ...`
  - This grounds AI responses in the selected journal entry without requiring the user to restate everything.

## 6) UI indication
- In `frontend/src/pages/ChatPage.jsx`, if the active conversation has `journal_context`, a banner is shown:
  - “Context loaded from a journal entry...”

## Result
End-to-end chain:
1. Journal entry -> click `Discuss in chat`
2. Route state -> new conversation with persisted `journal_context`
3. Every message in that conversation uses journal context in prompt construction
4. AI replies remain grounded to the selected journal reflection
