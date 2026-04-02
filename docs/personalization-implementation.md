# Personalizing Exhale AI Chatbot Responses

This document outlines the end-to-end implementation of personalizing the LLM's responses using user onboarding data specifically targeting their `nickname`, `age_range`, and preferred `topics`. 

By piping this data directly from the frontend request into the background AI worker, the LLM can offer a significantly more tailored accompanying experience.

## 1. Frontend Updates

**File Modified**: `frontend/src/pages/OnboardingPage.jsx`

We extended the onboarding experience to sequentially secure all necessary context from a new user regarding their identity and preferences, making it a 3-step process.

1. **Step 1 (Nickname)**: Implemented an initial view asking the user "What should we call you?".
2. **Step 2 (Age)**: Moved the age slider logic to specifically target age brackets.
3. **Step 3 (Topics)**: Sourced the user's focus goals for their therapy/companion sessions.

The final form submission was updated to seamlessly dispatch the user's `nickname` alongside the age and topics inside the final `PATCH` request sent to `/api/auth/me/`.

## 2. Backend Orchestration

To bridge the gap between simple Django `User` fields and the isolated LLM prompt construction, changes were systematically routed through the AI generation graph. 

### Step 1: Upgrading the AI State Dictionary
**File Modified**: `backend/chat/graph/state.py`
We added `user_nickname`, `user_age`, and `user_topics` attributes directly into the `ChatState` typed dictionary. This ensures that the active session's context tracker accurately accounts for typing and validation when executing the graph.

### Step 2: Extracting Data from the Request Context
**File Modified**: `backend/chat/views.py`
Inside the asynchronous background task tied to message creation (`SendMessageView.bg_thread`), we passed our new metadata into the AI's invocation configuration:
- Retrieved the direct `nickname` and `age_range` fields using `getattr(request.user)`.
- Re-mapped the many-to-many `topics` schema into plain list format `[t.name for t in topics]`.

### Step 3: Feeding Parameters into the Prompt Builder
**File Modified**: `backend/chat/graph/nodes.py`
The overarching `respond_node` acts as the traffic controller before hitting the LLM. We extended its behavior to pluck the newly tracked profile metrics directly from the graph `state` and pass them down internally into the local module `build_messages()`.

### Step 4: System Prompt Injection
**File Modified**: `backend/chat/services/llm_chat_service.py`
Inside `build_messages()`, we parsed the newly arriving parameters and appended a specific, dynamic instruction block directly onto the base AI system prompt:
- **Nickname Injection**: `"The user's nickname is '{user_nickname}'. Use it occasionally when appropriate."`
- **Age Injection**: `"The user is in the '{user_age}' age bracket. Keep this in mind to make your response age-appropriate."`
- **Topic Context**: `"The user is also interested in overcoming or exploring these topics: {topics_str}."`

If valid parameters exist, they are parsed cleanly into a continuous plain text block and stitched securely below the main instruction framework mapping.

---
**Summary**: Personalization data (Nickname, Age, Topic tags) flow seamlessly from initial UI collection to DB tracking, through the isolated messaging invocation loops, safely arriving into the hidden context config headers driving the Exhale models.
