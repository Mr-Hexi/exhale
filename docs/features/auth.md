# Auth

## What it does
Users can create an account and sign in to Exhale using JWT-based authentication. After login, the backend issues access and refresh tokens so protected API endpoints can be used securely.

## How it works
The frontend sends auth requests to `/api/auth/*`. Registration goes to `RegisterView`, which validates input with `RegisterSerializer`, checks uniqueness for username/email, and creates the user with Django's `create_user` (hashed password). Login and token refresh are handled by SimpleJWT views. On success, tokens are returned to the client and then used in `Authorization: Bearer <token>` for protected endpoints.

## API endpoints used
- `POST /api/auth/register/`
  - Request body:
    - `username` (string, required)
    - `email` (string, required)
    - `password` (string, required, min length 8)
  - Success response (`201`):
    - `{ "message": "registered", "user_id": <int> }`
  - Error responses:
    - `400`: `{ "error": { ...serializer errors... } }`
    - `500`: `{ "error": "Registration failed." }`
- `POST /api/auth/login/`
  - Request body:
    - `username` (string, required)
    - `password` (string, required)
  - Success response (`200`):
    - `{ "access": "<jwt>", "refresh": "<jwt>" }`
- `POST /api/auth/token/refresh/`
  - Request body:
    - `refresh` (string, required)
  - Success response (`200`):
    - `{ "access": "<jwt>" }`

## Key files
- `backend/users/views.py` (register API view)
- `backend/users/serializers.py` (registration validation + user creation)
- `backend/users/urls.py` (auth route mapping)
- `backend/users/models.py` (custom `User` model)
- `backend/exhale/urls.py` (project-level `api/auth/` include)
- `backend/exhale/settings.py` (JWT + DRF auth config, logging config)

## Edge cases handled
- Duplicate username is blocked with serializer validation error.
- Duplicate email is blocked with serializer validation error.
- Password shorter than 8 characters is rejected by serializer validation.
- Unexpected DB/server exceptions in register flow are caught and return a safe `500` response without exposing internals.

## Logging
- `INFO`: successful registration (`User registered: <user_id>`).
- `ERROR`: unexpected exceptions in `RegisterView` (`Unexpected error in RegisterView: ...`).

## Known limitations
- Email verification is not implemented yet.
- Password reset flow is not implemented yet.
- Login/token refresh paths currently rely on default SimpleJWT behavior and are not yet wrapped with project-specific logging/error customization.
