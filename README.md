# Visio-Conf

Visio-Conf is a Node.js (Express) video-conferencing backend with a static React UI served from `public/`. It integrates France Travail OAuth 2.0 (PKCE), generates ZEGOCLOUD meeting tokens, and ships a demo mode so you can evaluate the flow without external credentials.

## Scope

- **Backend:** Express API (`server.js`) handling OAuth, sessions, token generation, and health checks.
- **Frontend:** Static React UI embedded in `public/index.html` (no build step required).
- **Primary language:** JavaScript (Node.js + Express).

## Prerequisites

- Node.js **18+**
- npm **8+**
- Redis (optional, for shared sessions in production)
- France Travail developer account (optional, for real OAuth)
- ZEGOCLOUD account (optional, for production video tokens)

## Install

```bash
git clone https://github.com/Kvnbbg/visio-conf.git
cd visio-conf
npm install
cp .env.example .env
```

## Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The server listens on `http://localhost:3000` by default.

### CLI usage

```bash
node server.js --help
node server.js --version
```

## Configuration

Environment variables live in `.env`. Use `.env.example` as your base:

```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
DEMO_MODE=true

CORS_ALLOWED_ORIGINS=
RATE_LIMIT_MAX=100

ZEGOCLOUD_APP_ID=your_zegocloud_app_id
ZEGOCLOUD_SERVER_SECRET=your_zegocloud_server_secret
ALLOW_ZEGO_CLIENT_FALLBACK=true
ZEGOCLOUD_DEFAULT_MODE=fallback

FRANCETRAVAIL_CLIENT_ID=your_france_travail_client_id
FRANCETRAVAIL_CLIENT_SECRET=your_france_travail_client_secret
FRANCETRAVAIL_REDIRECT_URI=http://localhost:3000/auth/francetravail/callback

REDIS_URL=redis://localhost:6379
SENTRY_DSN=your_sentry_dsn_for_error_tracking
LOG_LEVEL=info
```

### Demo mode (first-run experience)

- When `DEMO_MODE=true` **or** France Travail credentials are missing, the app starts in demo mode.
- Use `/api/auth/demo-login` to create a session without OAuth.

## API usage examples

### Health

```bash
curl http://localhost:3000/api/health
```

### Demo login

```bash
curl -X POST http://localhost:3000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo@example.com"}'
```

### Generate a ZEGOCLOUD token

```bash
curl -X POST http://localhost:3000/api/generate-token \
  -H "Content-Type: application/json" \
  -d '{"roomID":"team-sync","userID":"alex"}'
```

### France Travail login

```bash
open http://localhost:3000/auth/francetravail/login
```

## Folder structure (entry points)

```
visio-conf/
├── server.js               # Express server entrypoint
├── public/index.html       # Static React UI (served directly)
├── lib/                    # Auth, config, middleware, logging, Redis
├── tests/                  # Jest test suite
├── .env.example            # Example environment configuration
```

> Note: `src/` contains older React components and is not wired to a build step yet. The production UI is served from `public/index.html`.

## Troubleshooting

- **CORS errors:** set `CORS_ALLOWED_ORIGINS` to a comma-separated list of allowed origins.
- **Sessions reset on refresh:** configure `REDIS_URL` in production so sessions persist across instances.
- **OAuth callback errors:** verify `FRANCETRAVAIL_REDIRECT_URI` matches the route `/auth/francetravail/callback`.
- **Health check fails:** ensure `npm start` is running and use `/api/health` (or `/health`).

## Security notes

- Replace `SESSION_SECRET` and ZEGOCLOUD secrets in production.
- Keep `.env` and `.secrets` out of source control.
- Demo mode is for local/testing only; disable it in production.
- OWASP-aligned pentest checklist: see [`docs/owasp-top-20-mistakes.md`](docs/owasp-top-20-mistakes.md).

## Contributing

1. Fork the repository and create a feature branch.
2. Install dependencies: `npm install`.
3. Run checks before submitting:
   ```bash
   npm run lint
   npm test
   ```
4. Open a pull request with a clear summary and test results.

## Testing & quality

```bash
npm test
npm run lint
npm run build
```

## License

MIT
