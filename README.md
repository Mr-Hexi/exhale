<div align="center">

# ex**h**ale

### *Say what you feel. We'll listen.*

A full-stack AI-powered emotional support platform that detects your emotions, responds with empathy, and tracks your wellbeing over time.

[![Django](https://img.shields.io/badge/Django-5.x-092E20?style=flat-square&logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## Screenshots

### Landing Page
![Landing Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/landing.png)
> *Full-width glassmorphic design with the core tagline, live chat preview, emotion cards, and safety section.*

---

### Login & Register

| Login | Register |
|-------|----------|
| ![Login](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/login.png) | ![Register](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/register.png) |

*Two-panel auth layout — branded hero on the left, clean form on the right. Logo links back to the landing page.*

---

### Chat
![Chat Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/chat.png)
> *Conversation threads sidebar · Quick mood check-in bar · WhatsApp-style message bubbles with emotion badges · Typing indicator.*

---

### Journal
![Journal Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/journal.png)
> *Inline new-entry form · Reverse-chronological list · AI insight generation per entry · Expand/collapse and inline editing · "Discuss in chat" handoff.*

---

### Dashboard
![Dashboard Page](https://raw.githubusercontent.com/Mr-Hexi/exhale/main/docs/screenshots/dashboard.png)
> *Mood-over-time area chart · Emotion breakdown with progress bars · Tracked logs count · Weekly AI-generated insight (6-hour cache).*

---

## What is Exhale?

Exhale is a safe, private AI companion for emotional wellbeing. Users can:

- **Talk freely** — type what's on their mind in a natural chat interface
- **Feel understood** — a two-layer ML + LLM emotion detector reads the emotion behind their words
- **Receive empathetic, tailored responses** — the LLM adapts its tone and content to the detected emotion, emotional stage (burnout/hopelessness/self-doubt), age range, and topics the user cares about
- **Reflect through journaling** — private journal entries with AI-generated insights
- **Discuss journal entries in chat** — turn any journal entry into a contextual conversation thread
- **Track patterns** — a mood dashboard shows emotional history over time with weekly AI-written summaries
- **Stay safe** — built-in crisis detection that surfaces real helplines (iCall, Vandrevala Foundation) when needed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Django 5.x + Django REST Framework |
| **Frontend** | React 19 + Vite 8 + Tailwind CSS v4 |
| **Database** | PostgreSQL + pgvector (for RAG embeddings) |
| **Emotion ML** | scikit-learn (TF-IDF + LogisticRegression) + LLM fallback below 0.70 confidence |
| **AI Pipeline** | LangGraph (stateful 4-node graph: crisis_check → detect_emotion → retrieve_context → respond) |
| **RAG** | pgvector knowledge base with `all-MiniLM-L6-v2` (384-dim) embeddings and multi-factor re-ranking |
| **LLM** | Swappable provider — OpenRouter / LLM API / Gemini / Groq, configured via `.env` |
| **Auth** | Django SimpleJWT (60-min access / 7-day refresh tokens) |
| **HTTP** | Axios with silent 401 refresh interceptor |
| **Streaming** | Server-Sent Events (SSE) with character-by-character typewriter rendering |

---

## Features

### Empathetic Chat
WhatsApp-style UI with real-time SSE-streamed AI responses. Each user message passes through a LangGraph pipeline that checks for crisis language, detects emotion and emotional stage, retrieves relevant knowledge, and generates a tailored response. Conversation history is persisted per thread with LangGraph's PostgresSaver checkpointer.

### Emotion Detection (Two-Layer)
```
User message
     │
     ▼
[Crisis Check] — keyword matching with negation handling
     │
     ▼
[Layer 1] scikit-learn model (TF-IDF + LogisticRegression)
     │  → Returns: emotion (happy/sad/anxious/angry) + confidence
     │
     ├── confidence ≥ 0.70 → use ML result directly
     │     (low-confidence "happy" at < 0.60 mapped to "neutral")
     │
     └── confidence < 0.70 → fallback to
         [Layer 2] LLM classification (temperature=0.0, forced-label response)
```

The original ML confidence score is always stored, even when LLM overrides the label.

### RAG-Augmented Responses
A pgvector knowledge base of mental health resources is searched at inference time. Retrieved chunks are re-ranked by:
1. **Semantic similarity** (cosine distance)
2. **Emotion bonus** (+0.18 exact match, +0.10 related, +0.06 untagged)
3. **Stage bonus** (+0.12 keyword match, +0.08 category match)
4. **Diversity filtering** (removes near-duplicate chunks above 0.88 similarity)

The top-3 formatted chunks are injected into the LLM system prompt. Crisis resources (`crisis_resource` category) are retrieved separately and never surfaced in normal chat.

### Journal with AI Insights
Write freely. Each entry runs through the same emotion detection pipeline. A separate LLM call generates a personalized AI insight. Mood logs are written on journal creation (non-crisis only). The **"Discuss in chat"** feature turns any journal entry into a new conversation with the journal's content, emotion, and insight injected as context.

### Mood Dashboard
- **MoodChart** — Recharts area chart with emotion-encoded Y-axis, custom dot, and tooltip
- **EmotionSummary** — progress bar breakdown sorted by frequency
- **Weekly Insight** — LLM-generated narrative of the past 7 days' mood data, cached for 6 hours to avoid redundant API calls
- **Tracked Logs** — total count from all sources (chat, journal, check-in)

### Crisis Detection & Safety
Crisis keywords are checked **before** ML classification and LLM calls — non-negotiable order. When triggered:
- The graph routes directly to `respond` (skips emotion detection and RAG retrieval)
- A dedicated crisis-safe system prompt is used with strict rules (no "why" questions, no intimate terms, always includes helplines)
- Response is post-processed to strip unsafe phrasing patterns
- A crisis banner with **iCall**, **Vandrevala Foundation**, and **findahelpline.com** renders in the chat UI
- `is_crisis: true` is flagged in the SSE response

### Personalized Onboarding
After registration, users complete a 3-step onboarding:
1. Choose a nickname (used for personal address)
2. Select age range (ensures age-appropriate tone)
3. Pick up to 3 topics of interest (injected into system prompt)

This metadata is woven into every AI response for a tailored conversation experience.

---

## Project Structure

```
exhale/
├── PROJECT_DOCUMENTATION.md          # Comprehensive project walkthrough
├── INTERVIEW_QA.md                   # Interview questions & answers by topic
├── PROJECT_CONTEXT_FOR_INTERVIEW.md  # Concise project state reference
├── CLAUDE.md                         # Quick-start learning guide
├── backend/
│   ├── manage.py
│   ├── exhale/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── users/
│   │   ├── models.py                 # User (AbstractUser), Topic, AgeRange
│   │   ├── views.py                  # Register, Profile CRUD, Topics
│   │   └── serializers.py
│   ├── chat/
│   │   ├── models.py                 # Conversation, ChatMessage, AIPrompt
│   │   ├── views.py                  # SSE streaming, conversation CRUD
│   │   ├── serializers.py
│   │   ├── graph/                    # LangGraph pipeline
│   │   │   ├── __init__.py           # Graph builder + PostgresSaver
│   │   │   ├── state.py              # ChatState TypedDict
│   │   │   ├── nodes.py              # crisis_check, detect_emotion, retrieve_context, respond
│   │   │   └── edges.py              # route_after_crisis, route_after_detection
│   │   └── services/
│   │       └── llm_chat_service.py   # Prompt building, streaming, crisis safety
│   ├── emotion/
│   │   ├── services/
│   │   │   └── emotion_service.py    # classify_emotion, check_crisis, should_exit_crisis
│   │   └── ml/
│   │       ├── train.py              # Training script (dair-ai/emotion dataset)
│   │       └── predict.py            # joblib model loading + predict()
│   ├── journal/
│   │   ├── models.py                 # JournalEntry
│   │   ├── views.py                  # CRUD + AI insight generation
│   │   └── serializers.py
│   ├── mood/
│   │   ├── models.py                 # MoodLog, MoodInsightCache
│   │   └── views.py                  # History, Stats, Checkin, WeeklyInsight
│   ├── knowledge/
│   │   ├── models.py                 # KnowledgeChunk (pgvector VectorField)
│   │   ├── services/
│   │   │   └── retrieval.py          # Embedding + cosine + re-ranking + diversity
│   │   └── management/
│   │       └── commands/
│   │           └── seed_knowledge.py # Seeds ~35 chunks
│   ├── prompts/
│   │   └── v2.py                     # Stage-aware, anti-repetition prompts
│   └── services/
│       └── llm_client.py             # Unified LLM client — provider swappable via .env
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/axios.js              # Axios instance + JWT interceptor
        ├── hooks/
        │   └── useChat.js            # SSE reader, journal handoff, chat state
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── OnboardingPage.jsx    # 3-step wizard (nickname → age → topics)
        │   ├── ChatPage.jsx
        │   ├── DashboardPage.jsx
        │   └── JournalPage.jsx
        └── components/
            ├── Chat/
            │   ├── ChatWindow.jsx
            │   ├── MessageBubble.jsx
            │   ├── EmotionBadge.jsx
            │   ├── InputBar.jsx
            │   ├── ConversationSidebar.jsx
            │   └── TypingIndicator.jsx
            ├── Dashboard/
            │   ├── MoodChart.jsx
            │   ├── EmotionSummary.jsx
            │   └── SkeletonCard.jsx
            ├── Journal/
            │   ├── JournalEntry.jsx
            │   └── AIInsight.jsx
            └── shared/
                ├── ProtectedRoute.jsx
                ├── ErrorBoundary.jsx
                ├── Navbar.jsx
                ├── Footer.jsx
                └── Logo.jsx
```

---

## Database ER Diagram

<style>
#erd { padding: 1rem 0; }
#erd svg { max-width: 100%; }
</style>
<div id="erd"></div>
<script type="module">
import mermaid from 'https://esm.sh/mermaid@11/dist/mermaid.esm.min.mjs';
const dark = matchMedia('(prefers-color-scheme: dark)').matches;
await document.fonts.ready;
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  fontFamily: '"Anthropic Sans", sans-serif',
  themeVariables: {
    darkMode: dark,
    fontSize: '13px',
    fontFamily: '"Anthropic Sans", sans-serif',
    lineColor: dark ? '#9c9a92' : '#73726c',
    textColor: dark ? '#c2c0b6' : '#3d3d3a',
    primaryColor: dark ? '#2a3a2a' : '#e1f5ee',
    primaryBorderColor: dark ? '#1d9e75' : '#0f6e56',
    primaryTextColor: dark ? '#9fe1cb' : '#085041',
    secondaryColor: dark ? '#2a2a3a' : '#eeedfe',
    secondaryBorderColor: dark ? '#7f77dd' : '#534ab7',
    secondaryTextColor: dark ? '#afa9ec' : '#3c3489',
    tertiaryColor: dark ? '#3a2a2a' : '#faece7',
    tertiaryBorderColor: dark ? '#d85a30' : '#993c1d',
    tertiaryTextColor: dark ? '#f09975' : '#4a1b0c',
    noteBkgColor: dark ? '#3a3420' : '#faeeda',
    noteTextColor: dark ? '#fac775' : '#633806',
    edgeLabelBackground: dark ? '#2c2c2a' : '#f1efe8',
    attributeBackgroundColorEven: dark ? '#1e2e1e' : '#f0faf5',
    attributeBackgroundColorOdd: dark ? '#252525' : '#ffffff',
  },
  er: {
    diagramPadding: 24,
    layoutDirection: 'TB',
    minEntityWidth: 140,
    minEntityHeight: 40,
    entityPadding: 14,
    useMaxWidth: true,
  }
});

const diagram = `erDiagram
    USER {
        bigint id PK
        string username UK
        string email UK
        string nickname
        string age_range
        datetime date_joined
    }
    TOPIC {
        bigint id PK
        string name UK
        string slug UK
    }
    USER_TOPIC {
        bigint id PK
        bigint user_id FK
        bigint topic_id FK
    }
    JOURNAL_ENTRY {
        bigint id PK
        bigint user_id FK
        text content
        string emotion
        text ai_insight
        datetime created_at
    }
    CONVERSATION {
        bigint id PK
        bigint user_id FK
        string title
        text journal_context
        datetime created_at
    }
    CHAT_MESSAGE {
        bigint id PK
        bigint user_id FK
        bigint conversation_id FK
        text content
        string role
        string emotion
        float emotion_confidence
        datetime timestamp
    }
    AI_PROMPT {
        bigint id PK
        string name
        string emotion
        text content
        datetime updated_at
    }
    MOOD_LOG {
        bigint id PK
        bigint user_id FK
        string emotion
        float confidence
        string source
        datetime logged_at
    }
    MOOD_INSIGHT_CACHE {
        bigint id PK
        bigint user_id UK
        text insight_text
        datetime generated_at
    }
    KNOWLEDGE_CHUNK {
        bigint id PK
        text content
        string category
        string emotion_tag
        vector embedding
        datetime created_at
    }

    USER ||--o{ JOURNAL_ENTRY : writes
    USER ||--o{ CONVERSATION : starts
    USER ||--o{ CHAT_MESSAGE : sends
    USER ||--o{ MOOD_LOG : generates
    USER ||--o| MOOD_INSIGHT_CACHE : has
    USER ||--o{ USER_TOPIC : has
    TOPIC ||--o{ USER_TOPIC : tagged_in
    CONVERSATION ||--o{ CHAT_MESSAGE : contains
`;

const { svg } = await mermaid.render('erd-svg', diagram);
document.getElementById('erd').innerHTML = svg;

document.querySelectorAll('#erd svg .node').forEach(node => {
  const firstPath = node.querySelector('path[d]');
  if (!firstPath) return;
  const d = firstPath.getAttribute('d');
  const nums = d.match(/-?[\\d.]+/g)?.map(Number);
  if (!nums || nums.length < 8) return;
  const xs = [nums[0], nums[2], nums[4], nums[6]];
  const ys = [nums[1], nums[3], nums[5], nums[7]];
  const x = Math.min(...xs), y = Math.min(...ys);
  const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x); rect.setAttribute('y', y);
  rect.setAttribute('width', w); rect.setAttribute('height', h);
  rect.setAttribute('rx', '8');
  for (const a of ['fill', 'stroke', 'stroke-width', 'class', 'style']) {
    if (firstPath.hasAttribute(a)) rect.setAttribute(a, firstPath.getAttribute(a));
  }
  firstPath.replaceWith(rect);
});

document.querySelectorAll('#erd svg .row-rect-odd path, #erd svg .row-rect-even path').forEach(p => {
  p.setAttribute('stroke', 'none');
});
</script>

---

## API Reference

### Auth (`/api/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register/` | Register a new user |
| `POST` | `/login/` | Login → returns JWT access + refresh tokens |
| `POST` | `/token/refresh/` | Refresh access token |
| `GET` | `/me/` | Get current user profile |
| `PATCH` | `/me/` | Update profile (nickname, age_range, topics) |
| `GET` | `/topics/` | List available onboarding topics |

### Chat (`/api/chat/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/conversations/` | List all conversations |
| `POST` | `/conversations/` | Create a new conversation |
| `PATCH` | `/conversations/<id>/` | Rename conversation |
| `DELETE` | `/conversations/<id>/` | Delete conversation |
| `POST` | `/<id>/send/` | Send message — SSE streaming response |
| `GET` | `/<id>/history/` | Fetch message history |
| `DELETE` | `/<id>/clear/` | Clear all messages in a conversation |

### Mood (`/api/mood/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/history/` | Mood log time series (for chart) |
| `GET` | `/stats/` | Aggregated counts per emotion |
| `POST` | `/checkin/` | Manual mood check-in |
| `GET` | `/weekly-insight/` | LLM-generated weekly summary (6hr cache) |

### Journal (`/api/journal/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List all journal entries |
| `POST` | `/` | Create entry (triggers emotion detection + mood log) |
| `GET` | `/<id>/` | Get single entry |
| `PUT` | `/<id>/` | Update entry (re-detects emotion) |
| `DELETE` | `/<id>/` | Delete entry |
| `POST` | `/<id>/insight/` | Generate AI insight for this entry |

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
LLM_PROVIDER=openrouter       # options: openrouter, llmapi, gemini, groq
LLM_MODEL=meta-llama/llama-3-8b-instruct

OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY=...
GROQ_API_KEY=...
LLMAPI_API_KEY=...
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
- PostgreSQL 15+ with `pgvector` extension

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
| LangGraph for chat pipeline | Stateful multi-node graph gives clean separation: safety → detection → retrieval → response. Crisis path skips normal branch cleanly. |
| Crisis check runs first | Safety is non-negotiable — ML and LLM are never consulted before crisis keywords are checked. |
| Two-layer emotion detection | Free/fast ML for high-confidence cases, expensive LLM fallback only when uncertain (< 0.70). |
| 6-hour weekly insight cache | Prevents redundant LLM calls on every dashboard refresh while staying fresh enough for daily users. |
| DB-driven prompts (AIPrompt model) | Change behavior without code deploys — iterate prompts via Django admin, emotion-specific variants via `(name, emotion)` unique key. |
| Provider swappable via `.env` | `llm_client.py` abstracts the provider — no code changes needed to switch from OpenRouter to Gemini to Groq. |
| `model.pkl` loads once at startup | Not per-request — avoids re-loading a multi-MB file on every inference. |
| MoodLog on journal create, not insight | Insight generation is optional; emotion logging should be immediate and reliable. |
| PostgreSQL + pgvector over dedicated vector DB | Single infrastructure, no cross-service latency, transactions cover both relational and vector data. Correct for this scale. |
| SSE over WebSocket | Simpler one-way streaming for chat responses. Lower server complexity. Trade-off: no bidirectional communication. |

---

## Safety & Privacy

- **No ads. No data sold.** User conversations are private.
- **Crisis detection is always on** — triggered before any ML or LLM processing.
- **Helpful lines surfaced**: iCall (9152987821), Vandrevala Foundation (1860-2662-345), and international helplines (findahelpline.com).
- **Exhale is a companion, not a replacement for professional help.** This is stated explicitly in the UI.
- JWT tokens stored in `localStorage`; silent refresh on 401 with automatic redirect on expiry.
- All `.env` files are gitignored — secrets never committed.
- All API queries scope records by `request.user` — no cross-user data access.

---

## Development Status

All core phases are complete:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Django scaffold, PostgreSQL, JWT auth, React+Vite | Done |
| 2 | Emotion ML model + LLM fallback + crisis detection | Done |
| 3 | LangGraph chat pipeline + RAG knowledge base + mood auto-logging | Done |
| 4 | Chat frontend (ChatWindow, MessageBubble, InputBar, ConversationSidebar, TypingIndicator, EmotionBadge) | Done |
| 5 | Mood + Journal backend (MoodLog, MoodInsightCache, JournalEntry) | Done |
| 6 | Journal frontend (inline edit, AI insight, expand/collapse, discuss-in-chat) | Done |
| 7 | Dashboard (MoodChart, EmotionSummary, weekly insight card) | Done |
| 8 | Onboarding (3-step wizard: nickname → age → topics), personalization in prompts | Done |

---

<div align="center">

**ex*h*ale** — *Your feelings deserve a place to breathe.*

</div>
