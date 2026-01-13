# Vercel deployment (easy deploy)

This project runs on Vercel using a serverless Node function for `server.js` and static hosting for `public/`.

## Quick deploy (CLI)

```bash
npm install -g vercel
vercel login
vercel link
vercel --prod
```

## One-click deploy (dashboard)

1. Import the repository in Vercel.
2. Framework preset: **Other**.
3. Build command: **none** (or leave empty).
4. Output directory: **leave empty**.
5. Set the environment variables listed below.
6. Deploy.

## Required environment variables

Use the same values as `.env.example` (or create Vercel secrets and map them):

- `SESSION_SECRET`
- `FRANCETRAVAIL_CLIENT_ID`
- `FRANCETRAVAIL_CLIENT_SECRET`
- `FRANCETRAVAIL_REDIRECT_URI`
- `ZEGOCLOUD_APP_ID`
- `ZEGOCLOUD_SERVER_SECRET`

## Optional environment variables

- `REDIS_URL` (recommended for production session persistence)
- `SENTRY_DSN`
- `CORS_ALLOWED_ORIGINS`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_MS`
- `LOG_LEVEL`
- `DEMO_MODE` (disable in production)

## Notes

- `vercel.json` routes all traffic to `server.js`, so API and UI are served from the same origin.
- If you use France Travail OAuth, ensure the redirect URI matches `/auth/francetravail/callback`.
