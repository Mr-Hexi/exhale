# Postman Test Setup

This folder contains a reusable Postman setup for the Exhale backend.

## Files

- `Exhale API.postman_collection.json`: Main API request collection.
- `Exhale Local.postman_environment.json`: Local environment variables.

## Quick Start

1. Open Postman.
2. Import both files from this folder.
3. Select the `Exhale Local` environment.
4. Run requests in this order:
   - `Auth/Register`
   - `Auth/Login` (stores `accessToken` and `refreshToken` automatically)
   - `Auth/Refresh Token`

## Future-Proof Workflow

When you add a new backend endpoint:

1. Create a new folder in the collection by app/domain (example: `Mood`, `Journal`).
2. Duplicate `Templates/Template - Auth Required (Copy Me)` or `Templates/Template - Public (Copy Me)`.
3. Update:
   - request name
   - HTTP method
   - URL path
   - request body
   - status-code assertion in the Tests tab
4. Keep using collection/environment variables such as `{{baseUrl}}`, `{{accessToken}}`.

## Notes

- Current active endpoints are under `api/auth/` only.
- The root URL include file has other apps commented out, so those are added as placeholders in the collection for easy expansion.
