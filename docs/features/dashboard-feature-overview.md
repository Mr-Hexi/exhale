# Dashboard Feature Overview

This document explains how the Dashboard feature works across frontend, backend, and database.

## Scope

The Dashboard page shows:
- Mood trend over time
- Emotion distribution
- Weekly AI insight

Primary frontend entry:
- `frontend/src/pages/DashboardPage.jsx`

Primary backend module:
- `backend/mood/views.py`

---

## High-Level Dataflow

1. User opens Dashboard page.
2. Frontend calls:
   - `GET /api/mood/history/`
   - `GET /api/mood/stats/`
   - `GET /api/mood/weekly-insight/`
3. Backend reads mood data from `MoodLog`.
4. Backend may read/write cached text in `MoodInsightCache` for weekly insight.
5. Frontend renders:
   - `MoodChart` from history
   - `EmotionSummary` from stats
   - Weekly insight text

---

## Backend Endpoints (Code-Level)

File: `backend/mood/urls.py`
- `history/` -> `MoodHistoryView`
- `stats/` -> `MoodStatsView`
- `checkin/` -> `MoodCheckinView`
- `weekly-insight/` -> `WeeklyInsightView`

Mounted at:
- `backend/exhale/urls.py` -> `/api/mood/...`

### 1) MoodHistoryView
File: `backend/mood/views.py`

Behavior:
- Reads `MoodLog` rows for `request.user`
- Orders by `logged_at`
- Returns fields:
  - `id`
  - `emotion`
  - `confidence`
  - `source`
  - `logged_at`

### 2) MoodStatsView
File: `backend/mood/views.py`

Behavior:
- Aggregates `MoodLog` by `emotion` for current user
- Returns dictionary like:
  - `{ "happy": 6, "anxious": 7, ... }`

Note:
- Includes all logged emotions in DB (including `neutral`).

### 3) MoodCheckinView
File: `backend/mood/views.py`, serializer in `backend/mood/serializers.py`

Behavior:
- Validates check-in emotion via `MoodCheckinSerializer`
- Creates `MoodLog` row with:
  - `source="checkin"`
  - `confidence=1.0`

### 4) WeeklyInsightView
File: `backend/mood/views.py`

Behavior:
- Uses `MoodInsightCache` (6-hour TTL via `CACHE_HOURS = 6`)
- If cache fresh: returns cached insight
- Else:
  - Builds 7-day summary from `MoodLog`
  - Sends prompt to LLM (`get_completion`)
  - Saves generated text to `MoodInsightCache`

Important current rule:
- `get_weekly_emotion_summary()` excludes `neutral` before building the LLM summary.

---

## Mood Data Ingestion Paths

Dashboard itself is read-only. Mood logs are written by other flows:

### A) Chat flow
File: `backend/chat/views.py` (`SendMessageView`)

After emotion detection:
- Creates `ChatMessage` (user message with emotion/confidence)
- Creates `MoodLog` with:
  - `source="chat"`
  - detected `emotion`
  - detected `confidence`

### B) Journal flow
File: `backend/journal/views.py` (`JournalListCreateView`)

On journal create:
- Detects emotion from content
- Saves `JournalEntry`
- Creates `MoodLog` with:
  - `source="journal"`
  - detected `emotion`
  - detected `confidence`
- Skips mood log on crisis path (`if not result.get("is_crisis")`)

### C) Manual mood check-in
File: `backend/mood/views.py` (`MoodCheckinView`)

Writes direct mood log with `source="checkin"`.

---

## Frontend Rendering Flow (Code-Level)

Main page:
- `frontend/src/pages/DashboardPage.jsx`

On mount:
- Fetches history, stats, weekly insight
- Tracks loading/error states
- Passes data to components

### 1) MoodChart
File: `frontend/src/components/Dashboard/MoodChart.jsx`

Behavior:
- Receives `moodHistory`
- Filters out `neutral` from chart data
- Plots only 4 emotions on Y axis:
  - `sad`, `anxious`, `angry`, `happy`

### 2) EmotionSummary
File: `frontend/src/components/Dashboard/EmotionSummary.jsx`

Behavior:
- Receives `stats`
- Filters out `neutral` before percentages
- Displays breakdown for non-neutral emotions only

### 3) Weekly Insight panel
File: `frontend/src/pages/DashboardPage.jsx`

Behavior:
- Shows spinner while insight loading
- Renders insight text if available
- Shows fallback message if unavailable

---

## Database Tables Used

## 1) `mood_moodlog` (Model: `MoodLog`)
File: `backend/mood/models.py`

Columns used by dashboard:
- `id`
- `user_id` (FK to auth user)
- `emotion`
- `confidence`
- `source` (`chat`, `journal`, `checkin`)
- `logged_at`

Used for:
- History chart
- Emotion stats
- Weekly summary generation

## 2) `mood_moodinsightcache` (Model: `MoodInsightCache`)
File: `backend/mood/models.py`

Columns:
- `id`
- `user_id` (OneToOne with auth user)
- `insight_text`
- `generated_at`

Used for:
- Caching weekly insight text for 6 hours

## 3) Related source tables (indirectly part of dashboard pipeline)

- `chat_chatmessage` (Model: `ChatMessage`)  
  Source of chat emotion events; writes corresponding `MoodLog`.

- `journal_journalentry` (Model: `JournalEntry`)  
  Source of journal emotion events; writes corresponding `MoodLog`.

---

## Neutral Emotion Handling (Current Behavior)

- Stored in backend logs (`MoodLog`) for completeness.
- Included in raw stats API payload.
- Excluded from:
  - Dashboard primary visualizations (`MoodChart`, `EmotionSummary`)
  - Weekly insight LLM prompt summary (`get_weekly_emotion_summary`)

This keeps data complete while focusing dashboard analytics on emotionally salient states.

---

## Operational Notes

- Weekly insight is cached for 6 hours per user.
- If no non-neutral mood data exists in the last 7 days, weekly insight returns:
  - `"Not enough mood data yet for an insight."`
- Dashboard remains partially usable if one API call fails (frontend handles errors per request).
