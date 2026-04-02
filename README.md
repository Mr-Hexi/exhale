<div align="center">

# ex**h**ale

### *Say what you feel. We'll listen.*

A full-stack AI-powered emotional support platform that detects your emotions, responds with empathy, and tracks your wellbeing over time.

[![Django](https://img.shields.io/badge/Django-4.x-092E20?style=flat-square&logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## Screenshots

### 🏠 Landing Page
![Landing Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/hero.png)
> *Full-width glassmorphic design with the core tagline, live chat preview, emotion cards, and safety section.*

---

### 🔑 Login & Register

| Login | Register |
|-------|----------|
| ![Login](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/login.png) | ![Register](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/register.png) |

*Two-panel auth layout — branded hero on the left, clean form on the right. Logo links back to the landing page.*

---

### 💬 Chat
![Chat Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/chat.png)
> *Conversation threads sidebar · Quick mood check-in bar · WhatsApp-style message bubbles with emotion badges · Smart action pills · Typing indicator.*

---

### 📓 Journal
![Journal Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/journal.png)
> *Inline new-entry form · Reverse-chronological list · AI insight generation per entry · Expand/collapse and inline editing.*

---

### 📊 Dashboard
![Dashboard Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/dashboard.png)
> *Mood-over-time area chart · Emotion breakdown with progress bars · Tracked logs count · Weekly AI-generated insight (6-hour cache).*

---

## What is Exhale?

Exhale is a safe, private AI companion for emotional wellbeing. Users can:

- **Talk freely** — type what's on their mind in a natural chat interface
- **Feel understood** — a custom ML model plus LLM fallback detects the emotion behind their words with 91.9% accuracy
- **Receive empathetic, tailored responses** — the LLM adapts its tone and content to the detected emotion, age range, and topics the user cares about
- **Reflect through journaling** — private journal entries with AI-generated insights
- **Track patterns** — a mood dashboard shows emotional history over time with weekly AI-written summaries
- **Stay safe** — built-in crisis detection that surfaces real helplines (iCall, Vandrevala Foundation) when needed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Django 4.x + Django REST Framework |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Database** | PostgreSQL + pgvector (for RAG embeddings) |
| **Emotion ML** | Custom-trained scikit-learn model (TF-IDF + Logistic Regression, 91.9% accuracy) + LLM fallback |
| **AI Pipeline** | LangGraph (stateful multi-node graph with PostgresSaver checkpointer) |
| **RAG** | pgvector knowledge base with `all-MiniLM-L6-v2` embeddings |
| **LLM** | Dynamic client — OpenRouter / Gemini / any OpenAI-compatible provider, swappable via `.env` |
| **Auth** | Django SimpleJWT (JWT access + refresh tokens) |
| **HTTP Client** | Axios with auto token refresh interceptor |

---

## Features

### 💬 Empathetic Chat
WhatsApp-style UI with real-time AI responses. Each user message is analysed for emotion — the response tone, content, and suggestions are tailored accordingly. Conversation history is persisted per thread via LangGraph's stateful pipeline.

### 🧠 Emotion Detection (Two-Layer)
```
User message
     │
     ▼
[Layer 1] Custom ML model (TF-IDF + Logistic Regression)
     │  → Returns: emotion + confidence score
     │
     ├── confidence ≥ 0.70 → use ML result directly
     │
     └── confidence < 0.70 → fallback to
         [Layer 2] LLM classification (returns one of: happy / sad / anxious / angry)
```
The original ML confidence score is always stored, even when the LLM overrides the label.

### 📊 RAG-Augmented Responses
A pgvector knowledge base of mental health resources is searched at inference time. Relevant context chunks are injected into the LLM system prompt before generating the response. Crisis resources are retrieved separately using a dedicated `crisis_resource` category — never surfaced in normal chat.

### 🧘 Smart Action Pills
After each AI response, contextual action suggestions appear (e.g. *"Try a breathing exercise"*, *"Journal about this"*). These are collapsible and never intrusive.

### 🚨 Crisis Detection
Crisis keywords are checked **before** ML classification and LLM calls — non-negotiable order. When triggered:
- The LLM responds using a dedicated crisis-safe system prompt
- Real helplines are surfaced: **iCall**, **Vandrevala Foundation**, international lines
- A non-dismissible crisis banner appears in the chat UI
- `is_crisis: true` is flagged in the API response; CBT follow-ups are suppressed

### 📓 Private Journal
Write freely. Each entry runs through the same emotion detection pipeline. A separate LLM call generates a personalised AI insight for the entry. Mood logs are written on journal creation — not on insight generation.

### 📈 Mood Dashboard
- **MoodChart** — Recharts area chart with emotion-encoded Y-axis, custom dot, and tooltip
- **EmotionSummary** — progress bar breakdown sorted by frequency
- **Weekly Insight** — LLM-generated narrative of the past 7 days' mood data, cached for 6 hours to avoid redundant API calls

### 🔒 CBT Follow-Up Prompts
After every few AI messages, a Cognitive Behavioural Therapy (CBT)-style follow-up prompt is sent as a natural next message (saved as an `assistant` message for persistence). Suppressed entirely on crisis paths.

---

## Project Structure

```
exhale/
├── context.md                      # Live project state tracker
├── claude.md                       # Architectural spec and coding conventions
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── services/
│   │   └── llm_client.py           # Unified LLM client — provider swappable via .env
│   ├── exhale/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── chat/
│   │   ├── models.py               # Conversation, ChatMessage
│   │   ├── views.py
│   │   ├── graph/                  # LangGraph pipeline
│   │   │   ├── nodes.py            # classify_emotion, retrieve_context, respond, log_mood
│   │   │   └── pipeline.py
│   │   └── services/
│   │       └── llm_chat_service.py
│   ├── emotion/
│   │   └── ml/
│   │       ├── train.py
│   │       ├── predict.py
│   │       └── model.pkl           # Trained model (not committed)
│   ├── knowledge/
│   │   ├── models.py               # KnowledgeChunk (pgvector)
│   │   └── services/
│   │       └── retrieval.py        # all-MiniLM-L6-v2 embedding + cosine search
│   ├── mood/
│   │   └── models.py               # MoodLog, MoodInsightCache
│   ├── journal/
│   │   └── models.py               # JournalEntry
│   ├── users/
│   │   └── models.py               # User (extends AbstractUser), Topic
│   └── prompts/
│       └── v1.py                   # All LLM prompts — never inline in service files
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── OnboardingPage.jsx
        │   ├── ChatPage.jsx
        │   ├── DashboardPage.jsx
        │   └── JournalPage.jsx
        ├── components/
        │   ├── shared/
        │   │   ├── Navbar.jsx
        │   │   ├── Logo.jsx        # Shared brand logo component
        │   │   ├── Footer.jsx      # Shared footer component
        │   │   ├── ProtectedRoute.jsx
        │   │   └── ErrorBoundary.jsx
        │   ├── Chat/
        │   │   ├── ChatWindow.jsx
        │   │   ├── MessageBubble.jsx
        │   │   ├── EmotionBadge.jsx
        │   │   ├── InputBar.jsx
        │   │   ├── SmartActionPill.jsx
        │   │   └── TypingIndicator.jsx
        │   ├── Dashboard/
        │   │   ├── MoodChart.jsx
        │   │   ├── EmotionSummary.jsx
        │   │   └── SkeletonCard.jsx
        │   └── Journal/
        │       ├── JournalEntry.jsx
        │       └── AIInsight.jsx
        ├── hooks/
        │   └── useChat.js
        └── context/
            └── AuthContext.jsx
```

---

## API Reference

### Auth (`/api/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register/` | Register a new user |
| `POST` | `/api/auth/login/` | Login → returns JWT access + refresh tokens |
| `POST` | `/api/auth/token/refresh/` | Refresh access token |

### Chat (`/api/chat/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat/conversations/` | List all conversations for the user |
| `POST` | `/api/chat/conversations/` | Create a new conversation |
| `GET` | `/api/chat/<id>/history/` | Fetch message history for a conversation |
| `POST` | `/api/chat/<id>/send/` | Send a message — returns AI response with emotion data |
| `DELETE` | `/api/chat/<id>/clear/` | Clear all messages in a conversation |

### Mood (`/api/mood/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mood/history/` | Mood log time series (for chart) |
| `GET` | `/api/mood/stats/` | Aggregated counts per emotion |
| `POST` | `/api/mood/checkin/` | Quick check-in `{ "emotion": "happy" }` |
| `GET` | `/api/mood/weekly-insight/` | LLM-generated weekly summary (6hr cache) |

### Journal (`/api/journal/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/journal/` | List all journal entries |
| `POST` | `/api/journal/` | Create a new entry (triggers emotion detection + mood log) |
| `GET/PUT/DELETE` | `/api/journal/<id>/` | Read, update, or delete a single entry |
| `POST` | `/api/journal/<id>/insight/` | Generate an AI insight for this entry |

---

## Environment Variables

### Backend (`.env`)
```env
DEBUG=True
SECRET_KEY=your-django-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/exhale_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173

# LLM — swap provider without touching any code
LLM_PROVIDER=openrouter       # options: openrouter, llmapi, gemini
LLM_MODEL=meta-llama/llama-3-8b-instruct

OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY=...
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:8000
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with pgvector extension

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your values

python manage.py migrate
python manage.py seed_knowledge # Seeds the RAG knowledge base
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env            # Set VITE_API_URL
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the landing page.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| LangGraph for chat pipeline | Stateful multi-node graph gives clean separation of concerns: classify → retrieve context → respond → log mood |
| Crisis check runs first | Safety is non-negotiable — ML and LLM are never consulted before crisis keywords are checked |
| ML confidence threshold 0.70 | Below this the model is uncertain; LLM fallback is more reliable |
| 6-hour weekly insight cache | Prevents redundant LLM calls on every dashboard load |
| All prompts in `prompts/v1.py` | Enables prompt versioning — copy to `archive/v1.py`, create `v2.py`, update imports |
| Provider swappable via `.env` | `llm_client.py` abstracts the provider — no code changes needed to switch models |
| `model.pkl` loads once at startup | Not per-request — avoids re-loading a multi-MB file on every inference |
| MoodLog on journal create, not insight | Insight generation is optional; emotion logging should be immediate and reliable |

---

## Safety & Privacy

- **No ads. No data sold.** User conversations are private.
- **Crisis detection is always on** — triggered before any ML or LLM processing.
- **Helpful lines surfaced**: iCall, Vandrevala Foundation, and international crisis helplines.
- **Exhale is a companion, not a replacement for professional help.** This is stated explicitly in the UI.
- JWT tokens stored in `localStorage`; silent refresh on 401 with automatic redirect on expiry.
- All `.env` files are gitignored — secrets never committed.

---

## Development Status

All 8 build phases are complete:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Django scaffold, PostgreSQL, JWT auth, React+Vite | ✅ Done |
| 2 | Emotion ML model (91.9% acc.), LLM fallback, crisis detection | ✅ Done |
| 3 | LangGraph chat pipeline, RAG knowledge base, mood auto-logging | ✅ Done |
| 4 | Chat frontend (ChatWindow, EmotionBadge, SmartActionPill, InputBar) | ✅ Done |
| 5 | Mood + Journal backend (MoodLog, MoodInsightCache, JournalEntry) | ✅ Done |
| 6 | Journal frontend (inline edit, AI insight, expand/collapse) | ✅ Done |
| 7 | Dashboard (MoodChart, EmotionSummary, weekly insight card) | ✅ Done |
| 8 | Polish (CBT prompts, ErrorBoundary, TypingIndicator, mobile nav) | ✅ Done |

---

<div align="center">

**ex*h*ale** — *Your feelings deserve a place to breathe.*

</div>
