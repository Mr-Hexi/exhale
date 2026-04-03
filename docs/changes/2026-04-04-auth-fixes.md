# Auth Fixes: Login Error Refresh + Registration Validation

Date: 2026-04-04

## What changed

### 1) Frontend login behavior fix
- File: `frontend/src/api/axios.js`
- Updated the Axios 401 interceptor to **skip silent token refresh** for auth endpoints:
  - `/api/auth/login/`
  - `/api/auth/register/`
  - `/api/auth/token/refresh/`
- Added a refresh-token presence guard before trying refresh.

### 2) Backend registration validation hardening
- File: `backend/users/serializers.py`
- `username` is now trimmed and validated for empty values.
- `email` is now trimmed + lowercased.
- Duplicate email checks are now case-insensitive (`email__iexact`).
- Added Django password validator enforcement (`validate_password`) in addition to minimum length.

### 3) Added registration tests
- File: `backend/users/tests.py`
- Added tests for:
  - email normalization
  - duplicate username rejection
  - duplicate email rejection (case-insensitive)
  - weak password rejection via Django validators

## Why these changes were needed
- Login with wrong credentials showed an error briefly and then refreshed the page because the global 401 interceptor treated failed login like an expired session and redirected to `/login`.
- Registration logic needed stronger validation for realistic edge cases (case-variant duplicate emails, weak passwords, whitespace input).
- Tests were added so this behavior remains stable during future changes.

## Outcome
- Wrong login credentials now show a stable error message without forced page refresh.
- Registration is more robust and consistent.
- Core registration edge cases are now covered with tests.
