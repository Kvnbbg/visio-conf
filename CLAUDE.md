# Visio-Conf Context

## Project summary
- Express backend (`server.js`) serving a static React UI from `public/`.
- OAuth integration (France Travail) with demo mode fallback.
- ZEGOCLOUD token generation for video sessions.

## Key commands
- `npm run dev` — start dev server with nodemon.
- `npm start` — start production server.
- `npm test` — run Jest test suite.
- `npm run lint` — run ESLint.

## Deployment notes (Vercel)
- Uses `vercel.json` with `@vercel/node` for `server.js` and `@vercel/static` for `public/`.
- Configure Vercel project environment variables to match `.env.example`.
- See `docs/vercel-deploy.md` for step-by-step deployment.

## Operational caveats
- Demo mode is enabled when `DEMO_MODE=true` or France Travail credentials are missing.
- In production, set `SESSION_SECRET` and disable demo mode.
