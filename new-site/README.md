# Rail Statistics — Next.js site

Next.js port of the Rail Statistics web app (migrated from the Vite/React SPA).

## Commands

```bash
npm ci
npm run dev      # http://localhost:3000
npm run build
npm run start
npm test
```

## Environment

Copy `.env.local.example` → `.env.local` and fill in Firebase + feature flags. See `netlify.env.example` for production (Netlify site env).

Required for full functionality:

- `NEXT_PUBLIC_FIREBASE_*` — Auth, Firestore, Storage
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — App Check (production)
- `DARWIN_API_KEY` (+ optional `DARWIN_API_ORIGIN`) — departures, units, services, API status

## Deploy

Netlify config at monorepo root (`netlify.toml`). Build base: `new-site/`.

Firebase rules/indexes: `firestore.rules`, `storage.rules`, `firestore.indexes.json` (deploy separately via Firebase CLI).

## Route map

Public: `/`, `/stations/map`, `/stations/:network/:slug`, `/migration`, `/departures`, `/units`, `/privacy`, `/eula`

Protected (`/admin/*`): stations CRUD, map editing, design system, messages, API status

Legacy URLs redirect via `next.config.ts` (e.g. `/stations` → `/admin/stations`).

PWA: `public/sw.js` registers in production. SEO: `/sitemap.xml`, `/robots.txt`, OpenGraph metadata.
