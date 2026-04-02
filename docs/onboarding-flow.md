# Post-Login Onboarding Architecture

This document explains the rationale and technical implementation details behind the new **Post-Login Onboarding** mechanism created for Exhale.

## Objective

The goal was to gather necessary user demographics (`age_range`) and personal goals (up to 3 distinct mental wellness `topics`) during the user's first interaction with the application.

Rather than cluttering the initial registration screen (which introduces friction and causes drop-offs), we implemented a post-login onboarding sequence. This ensures a clean separation of concerns and safely keeps the Django `User` model decoupled from hardcoded values.

---

## 1. Backend Implementation

### A. Model Cleanliness & Data Migration
The AI's suggestion was structurally brilliant: "Keep the User model clean — use a separate Topic model with a ManyToMany."
- We leveraged the `Topic` model natively mapped to the `User` via `topics = models.ManyToManyField(Topic)`.
- We wrote a custom Django data migration (`users/migrations/0002_populate_topics.py`) that strictly injects fixed clinical topics into the database upon migration (`"Stress"`, `"Anxiety"`, `"Burnout"`, `"Loneliness"`, etc.). 
- By running `conda run -n autosignal python manage.py migrate`, we ensured these topics are persistent, editable via Django admin, but highly accessible through the API.

### B. Scalable API Endpoints
To serve the frontend intelligently, we extended `backend/users/views.py` and `backend/users/urls.py` with two new essential REST endpoints:
1. `GET /api/auth/topics/`: Provides the frontend with the exhaustive list of populated mental wellness topics that the user can pick from.
2. `GET /api/auth/me/` and `PATCH /api/auth/me/`: A dedicated profile controller. By hitting the PATCH route, the frontend safely updates the user's `age_range` and chosen `topics` via a refined `UserProfileSerializer`.

---

## 2. Frontend Implementation

### A. Context Synchronization (`AuthContext.jsx`)
To make UI protection instantaneous, we modified the global React `AuthContext` to fetch the logged-in user profile (`/api/auth/me/`) on load. This parses out exactly if the user has completed their profile fields (like `age_range`) alongside validating their JWT token.

### B. Intelligent Protected Routing (`ProtectedRoute.jsx`)
We expanded the React-Router logic surrounding `ProtectedRoute`. Every page rendered underneath it (Dashboard, Chat, Journal) validates the following sequence before painting the screen:
1. **Unauthenticated?** Sends to `/login`.
2. **Authenticated but missing `age_range`?** Traps the user and permanently redirects to `/onboarding`.
3. **Fully Authenticated & Configured?** Proceed flawlessly to normal layout.

This logic makes the onboarding experience completely frictionless but strictly enforced.

### C. The Two-Step UI Flow (`OnboardingPage.jsx`)
We built a visually pristine, component-level onboarding screen inside `pages/OnboardingPage.jsx`. Leveraging internal state variables, the UI splits the data collection gracefully:
- **Step 1:** Displays mapping buttons to the Backend dictionary of `age_ranges` (Under 18, 18-24, etc.).
- **Step 2:** Actively fetches the Topic list via the generic endpoint. It utilizes responsive button pill mapping, tracking array inputs until the user strikes the strict hard-limit of 3 topics.
- **Completion:** It validates the choices, dispatches a background HTTP PATCH to `/api/auth/me/`, triggers `fetchUser()` to update the global memory context, and sequentially unlocks the remainder of the Exhale platform by routing the user to `/chat`. 
