# LWAVEE — REST API Reference

All requests must use `Content-Type: application/json` and provide `Authorization: Bearer <token>` when accessing protected routes.

## Public & Health Endpoints
- `GET /` — Service identification and status.
- `GET /api/health` — Decoupled health check responding 200 without requiring active database connection.

## Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account.
- `POST /api/auth/login` — Sign in and receive JWT token + HttpOnly cookie.
- `POST /api/auth/logout` — Invalidate session.
- `GET /api/auth/me` — Retrieve active user profile.
- `PUT /api/auth/preferences` — Update language and timezone preferences.

## Content Management (`/api/content`)
- `GET /api/content` — Paginated list of content items with status filters.
- `POST /api/content` — Create a new draft or generated post.
- `GET /api/content/:id` — Get post details.
- `PUT /api/content/:id` — Update post details.
- `DELETE /api/content/:id` — Delete post.
- `POST /api/content/:id/approve` — Approve content for scheduled publishing.
- `POST /api/content/:id/reject` — Reject content.

## AI Content Studio (`/api/ai`)
- `POST /api/ai/generate-caption` — Call OpenRouter to generate viral Instagram captions and hashtags.
- `GET /api/ai/history` — Get recent generation history.

## Instagram Integration (`/api/instagram`)
- `GET /api/instagram/auth-url` — Generate Meta OAuth URL with signed JWT state.
- `GET /api/instagram/callback` — Meta redirect callback exchanging code for 60-day token.
- `GET /api/instagram/account` — Get connected account summary.
- `POST /api/instagram/disconnect` — Disconnect account.

## Internal Cloud Scheduler (`/api/internal/scheduler`)
- `POST /api/internal/scheduler/run` — Secured endpoint called by GitHub Actions cron every 15 minutes. Requires `x-scheduler-secret`.
