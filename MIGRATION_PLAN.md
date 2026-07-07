# Rail Statistics Website — Next.js Migration Plan

**Source:** `Old Website /RailStatisticsWebsite` (React 19 + TypeScript + Vite 7 SPA)
**Target:** `new-site/` (Next.js 16 App Router)
**Status:** **Phase 1 complete** (signed off 7 Jul 2026). **Phase 2 implemented** — live Firebase, auth, admin workflows, Darwin proxy, migration tool, and all routes wired. **Polish complete** (7 Jul 2026): PWA service worker, SEO (sitemap/robots/OpenGraph), legacy edit redirects, analytics page views, layout performance (removed root `force-dynamic`).

---

## 1. Executive Summary

This is a **port, not a rebuild from scratch**: the existing React 19 + TypeScript SPA (Vite, Firebase Auth/Firestore/Storage, Leaflet maps, Netlify hosting) will be re-implemented feature-for-feature in Next.js, preserving the exact visual design, design tokens, component behavior, routes, and Firebase data model. The goals of the migration are **reliability** (a more standard, actively-maintained framework with built-in routing/SSR conventions), **speed** (better asset/image handling, code-splitting, and caching defaults out of the box), and **maintainability** (a more conventional file-based routing structure, room to adopt Server Components incrementally, and a cleaner separation of admin vs. public surfaces via a new `/admin/*` URL structure). The migration is split into two phases with a **hard pause and explicit approval gate between them**: **Phase 1** builds the entire static/visual shell of the site (layout, design tokens, all UI components, homepage, placeholder pages) with no live Firebase data or real authentication, so the user can review pixel-for-pixel fidelity before any backend complexity is introduced; **Phase 2** wires in all live functionality (Firebase Auth/Firestore/Storage, the CSV migration tool, live map data, Darwin departures, admin editing workflows, Cloud Functions, security rules, and PWA support). Work will not begin on Phase 2 until the user has reviewed Phase 1 and explicitly signed off.

---

## 2. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js (latest stable), App Router | Modern standard, good Netlify support, room to use Server Components selectively |
| **Language** | TypeScript throughout | Matches old site; no regression in type safety |
| **Styling** | Plain CSS / CSS Modules, using design tokens ported **1:1** from `src/styles/index.css` | Lowest risk — preserves exact visual fidelity; avoids a Tailwind rewrite of ~60+ button variants and bespoke component CSS |
| **Rendering strategy** | Mostly **Client Components** (`"use client"`), mirroring current SPA behavior | The app is dominated by client-side Firebase SDK usage, auth state, Leaflet maps, and interactive forms — fighting this with Server Components adds risk for little benefit right now |
| **Server Components usage** | Only where trivially beneficial | e.g. static legal pages (`/privacy`, `/eula`), and static shell/layout metadata. Not forced onto anything touching auth, Firestore, or Leaflet |
| **Package manager** | npm | Matches old site (`package-lock.json` workflow), no need to introduce pnpm/yarn |
| **Hosting** | Netlify (unchanged) | Minimal deployment change; Next.js has an official Netlify adapter (`@netlify/plugin-nextjs`) |
| **Netlify Functions → Next.js** | **Convert `osm-tile`, `nominatim-proxy`, and `darwin-proxy` to Next.js Route Handlers** (`app/api/.../route.ts`) | See justification below |
| **Firebase Cloud Functions** | Left as-is (separate `functions/` deployment, unrelated to Netlify/Next.js) | These run on Firebase's own infra regardless of frontend framework — no migration needed, just carried over as a sibling deployment |

### Netlify Functions vs. Next.js Route Handlers — recommendation

**Recommendation: migrate the three Netlify Functions (`osm-tile`, `nominatim-proxy`, `darwin-proxy`) to Next.js Route Handlers under `app/api/*`.**

- Next.js on Netlify runs via `@netlify/plugin-nextjs`, which already compiles API routes to Netlify Functions under the hood — so functionally you get the same result, but with one deployment artifact and one routing system instead of two.
- Keeping them as standalone Netlify Functions (`netlify/functions/*`) alongside Next.js is *possible* and slightly lower-effort to lift-and-shift verbatim, but it means two separate proxy/routing systems to reason about (Next.js middleware/routing for pages, Netlify's own function routing for these three endpoints), duplicated environment variable configuration, and a less standard Next.js project layout.
- Trade-off to flag: Route Handlers on Netlify have the same execution model constraints as Netlify Functions (cold starts, execution time limits), so there is no functional loss — this is purely a code-organization decision in favor of the more standard, more maintainable Next.js-native approach.

---

## 3. New Site Location & Project Setup

- **Location:** `/Users/jackwingate/Documents/Rail Statistics/CODEBASES/New-Rail Statistics Web/New Site` (sibling to `Old Website `, not yet created).
- **Scaffolding** (for Phase 1 kickoff, not part of this planning task):
  - `npx create-next-app@latest "New Site"` with: TypeScript ✅, ESLint ✅, App Router ✅, Tailwind ❌ (explicitly declined — plain CSS/CSS Modules per decision above), `src/` directory (to mirror old site's `src/`-rooted layout), default import alias `@/*`.
  - Node version pinned via `.nvmrc` to match whatever the old site's Netlify build uses (check `Old Website /RailStatisticsWebsite/netlify.toml` / `package.json engines` during scaffold).
  - Add `@netlify/plugin-nextjs` and a `netlify.toml` in `New Site` configuring the Next.js runtime.
  - Recreate the ESLint 9 flat-config conventions from the old site where compatible with Next.js's ESLint setup.
  - Vitest carried over for unit tests (Next.js doesn't mandate a specific test runner); component tests ported alongside components as they're built.

### Environment variable renaming

Vite exposes client-side env vars via `VITE_*`; Next.js requires `NEXT_PUBLIC_*` for anything bundled into client code. Server-only secrets get **no prefix** and are only read in Route Handlers / server code.

| Old (`VITE_*`) | New | Exposure |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `NEXT_PUBLIC_FIREBASE_API_KEY` | Client-safe (Firebase web API keys are not secrets — they identify the project, not authorize access; security is enforced by Firestore/Storage rules and App Check) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client-safe |
| `VITE_FIREBASE_PROJECT_ID` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client-safe |
| `VITE_FIREBASE_STORAGE_BUCKET` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client-safe |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client-safe |
| `VITE_FIREBASE_APP_ID` | `NEXT_PUBLIC_FIREBASE_APP_ID` | Client-safe |
| `VITE_FIREBASE_MEASUREMENT_ID` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Client-safe (Analytics) |
| `VITE_RECAPTCHA_SITE_KEY` (App Check) | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Client-safe (reCAPTCHA site keys are designed to be public; the secret key, if any server-side verification exists, stays unprefixed) |
| `VITE_USE_FIREBASE_EMULATOR` | `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` | Client-safe (dev flag) |
| `VITE_USE_LOCAL_DATA_ONLY` | `NEXT_PUBLIC_USE_LOCAL_DATA_ONLY` | Client-safe (dev flag) |
| `VITE_LOCAL_DEV_LOGIN_BYPASS` | `NEXT_PUBLIC_LOCAL_DEV_LOGIN_BYPASS` | Client-safe (dev-only flag, must be stripped/ignored in production builds) |
| Darwin API credentials (used inside `netlify/functions/darwin-proxy`) | **Unprefixed**, e.g. `DARWIN_API_TOKEN` | **Server-only** — must never leak to the client; read only inside the new `app/api/darwin/route.ts` handler |
| Nominatim / OSM proxy config (if any keys/tokens) | Unprefixed server-only equivalents | **Server-only** |

> **Note:** Firebase Admin SDK credentials (used by Cloud Functions, not the frontend) are unrelated to this renaming — they stay in the `functions/` deployment's own environment configuration.

---

## 4. New URL / Route Map

Legend — **Access**: Public (P) / Protected (Pr). **Protection mechanism**: Next.js has no built-in session-aware middleware for client-SDK Firebase auth (Firebase Auth state lives in the browser via SDK listeners, not readable in Edge middleware without a session cookie). Recommended pattern: a lightweight `middleware.ts` that only handles cosmetic route grouping/redirects (no real auth check possible without a cookie-based session), **plus** a client-side `<ProtectedRoute>` wrapper (direct port of the existing `src/components/firebase/ProtectedRoute.tsx`) used inside protected layouts (`app/(admin)/layout.tsx`) that checks Firebase auth state client-side and redirects unauthenticated users to `/log-in`. This matches the old site's actual behavior (client-side gate, not server-side).

**Phase key**: **P1-placeholder** = built in Phase 1 with mock/static data and correct layout/styling only · **P1-real** = fully functional in Phase 1 (no backend dependency needed) · **P2** = wired up with real functionality in Phase 2.

| Old Route | New Route (Next.js path) | App Router file | Access | Phase |
|---|---|---|---|---|
| `/` , `/home` | `/` | `app/page.tsx` | P | P1-real (static) |
| `/log-in` | `/log-in` | `app/log-in/page.tsx` | P (must stay accessible unauthenticated) | P1-placeholder (UI shell only) → P2 (real auth) |
| `/migration` | `/migration` (**stays public, unchanged**) | `app/migration/page.tsx` | **P** | P2 |
| `/stations/map` (public beta + `?admin=1`) | `/stations/map` (public viewer) | `app/stations/map/page.tsx` | P | P1-placeholder (sample data + Leaflet) → P2 (live data) |
| `/stations/map?admin=1` (admin editing overlay) | `/admin/map` (**admin editing split out**) | `app/admin/map/page.tsx` | Pr | P2 |
| `/stations/:network/:stationSlug` | `/stations/:network/:stationSlug` | `app/stations/[network]/[stationSlug]/page.tsx` | P | P2 (needs live Firestore data) |
| `/stations/:legacyStationId` (legacy redirect) | `/stations/:legacyStationId` | `app/stations/[legacyStationId]/page.tsx` (redirect logic) | P | P2 |
| `/buttons` (public design demo) | `/buttons` | `app/buttons/page.tsx` | P | P1-real |
| `/departures`, `/departures/:code` | `/departures`, `/departures/:code` | `app/departures/page.tsx`, `app/departures/[code]/page.tsx` | P | P2 (Darwin proxy) |
| `/services/:rid` | `/services/[rid]` | `app/services/[rid]/page.tsx` | P | P2 (Darwin proxy) |
| `/units`, `/units/:unitId` | `/units`, `/units/:unitId` | `app/units/page.tsx`, `app/units/[unitId]/page.tsx` | P | P2 (Darwin proxy) |
| `/privacy` | `/privacy` | `app/privacy/page.tsx` | P | **P1-real** (static/legal, low risk — see assumption) |
| `/eula` | `/eula` | `app/eula/page.tsx` | P | **P1-real** (static/legal — see assumption) |
| 404 | 404 | `app/not-found.tsx` | P | P1-real |
| `/stations`, `/stations/edit` (protected list/admin) | **`/admin/stations`** | `app/admin/stations/page.tsx` | **Pr** | P2 (needs Firestore) — placeholder shell in P1 |
| `/stations/pending-review` | **`/admin/stations/pending-review`** | `app/admin/stations/pending-review/page.tsx` | Pr | P2 |
| `/stations/new` | **`/admin/stations/new`** | `app/admin/stations/new/page.tsx` | Pr | P2 |
| `/stations/:network/:stationSlug/edit` | **`/admin/stations/:network/:stationSlug/edit`** | `app/admin/stations/[network]/[stationSlug]/edit/page.tsx` | Pr | P2 |
| `/design-system` (hub) | **`/admin/design-system`** | `app/admin/design-system/page.tsx` | Pr (see gating note below) | **P1-placeholder/real** |
| `/design-system/colours` | **`/admin/design-system/colours`** | `app/admin/design-system/colours/page.tsx` | Pr | P1 |
| `/design-system/typography` | **`/admin/design-system/typography`** | `app/admin/design-system/typography/page.tsx` | Pr | P1 |
| `/design-system/buttons` | **`/admin/design-system/buttons`** | `app/admin/design-system/buttons/page.tsx` | Pr | P1 |
| `/design-system/layout` | **`/admin/design-system/layout`** | `app/admin/design-system/layout/page.tsx` | Pr | P1 |
| `/design-system/components` | **`/admin/design-system/components`** | `app/admin/design-system/components/page.tsx` | Pr | P1 |
| `/design-system/icons` | **`/admin/design-system/icons`** | `app/admin/design-system/icons/page.tsx` | Pr | P1 |
| `/design-system/heros` | **`/admin/design-system/heros`** | `app/admin/design-system/heros/page.tsx` | Pr | P1 |
| `/admin/messages` | `/admin/messages` (unchanged) | `app/admin/messages/page.tsx` | Pr | P2 |
| `/admin/messages/new` | `/admin/messages/new` (unchanged) | `app/admin/messages/new/page.tsx` | Pr | P2 |
| `/admin/messages/:messageId` | `/admin/messages/:messageId` (unchanged) | `app/admin/messages/[messageId]/page.tsx` | Pr | P2 |
| `/api-status` | **`/admin/api-status`** ⚠️ *(assumption — see §8)* | `app/admin/api-status/page.tsx` | Pr | P2 |

**Reconciling the `/admin/*` restructuring:** the user's original ask listed `/admin/stations`, `/admin/map`, `/admin/migration` — but the clarification explicitly overrides `/admin/migration`: **`/migration` stays public and unprefixed**, exactly as it behaves today (full CSV wizard, no login wall). The `/admin/` prefix is applied instead to: the protected Stations list/admin/edit flows (`/stations` → `/admin/stations`), the admin-only editing layer of the map (`/stations/map?admin=1` → `/admin/map`, while the plain public map viewer stays at `/stations/map`), the full Design System section (`/design-system/*` → `/admin/design-system/*`), and — as new proposals to confirm — Message Centre (already effectively admin-only, URL unchanged at `/admin/messages/*`) and API Status (`/api-status` → `/admin/api-status`). **`/log-in` itself is never prefixed** since it must remain reachable by signed-out users.

---

## 5. Phase 1 Scope — Foundations

Phase 1 builds the entire visual/structural shell of the site with **no live Firebase data and no real authentication**. Goal: the user can browse the new site and confirm it looks and feels identical to the old one before any backend risk is introduced.

### 5.1 Project scaffold & config
- [ ] `create-next-app` scaffold in `New Site` (TypeScript, App Router, no Tailwind, ESLint)
- [ ] `netlify.toml` + `@netlify/plugin-nextjs` configured
- [ ] `.env.local.example` documenting all renamed env vars (see §3)
- [ ] ESLint 9 config ported/adapted from old site
- [ ] Vitest set up for component tests
- [ ] Base `tsconfig.json` path aliases matching old site's import conventions

### 5.2 Design tokens & global styles
- [ ] Port `src/styles/index.css` **exactly** into `New Site` (fonts, light/dark theme variables, accent palette, spacing scale, radius scale, type scale, breakpoints/containers, button colour variants, hero tints, shadows, SuperTram brand colour, `.font-aronetiv`/`.font-aronetiv-normal` helpers, 44×44px touch target rule, `prefers-reduced-motion`, `text-wrap: pretty`, `.container` class, safe-area-inset handling, fixed header height)
- [ ] Port `App.css` layout shell equivalent (root layout wrapper in `app/layout.tsx` + a `layout.module.css` or global stylesheet)
- [ ] Theme switching mechanism: `data-theme` attribute on `<html>`, `useTheme` hook ported, `localStorage` key `'theme'` preserved — must avoid hydration flash (inline blocking script in `app/layout.tsx` `<head>` to set `data-theme` before paint, same technique commonly used for dark-mode SSR apps)
- [ ] Global font loading (Geologica, Aronetiv) via `next/font/local` pointing at copied font files

### 5.3 Design system pages (all 7 sections)
> **Decision point flagged for user:** these pages are protected in the old site, but per the new URL decisions they now live at `/admin/design-system/*`. Since real auth isn't wired until Phase 2, two options:
> - **Option A (recommended):** leave `/admin/design-system/*` **open/ungated in Phase 1 dev builds** (no `<ProtectedRoute>` wrapper yet — it's a no-op placeholder), and apply the real auth gate as part of Phase 2 once `ProtectedRoute` is wired to live Firebase Auth. Lowest effort, zero risk since Phase 1 isn't the production deployment target yet.
> - **Option B:** stub a fake/dummy login gate in Phase 1 just for these pages. Adds throwaway work for no real security benefit (Phase 1 has no real backend to protect).
> - **This plan recommends Option A** — flagged in §8 for explicit confirmation.

- [ ] `/admin/design-system` hub page
- [ ] `/admin/design-system/colours`
- [ ] `/admin/design-system/typography`
- [ ] `/admin/design-system/buttons` (full ~998-line equivalent — every button variant demoed)
- [ ] `/admin/design-system/layout`
- [ ] `/admin/design-system/components`
- [ ] `/admin/design-system/icons` (all ~20 inline SVG icons catalogued)
- [ ] `/admin/design-system/heros`
- [ ] `/buttons` — public duplicate demo page, ported as-is

### 5.4 Components (full component-by-component checklist)

**buttons/** (~60+ variants, ported as-is with same props/behavior, styled via CSS Modules using ported tokens)
- [ ] `BUTBaseButton`, `BUTBaseButtonBar`, `BUTWideButton`, `BUTTabButton`, `BUTOperatorChip`
- [ ] `BUTSquaredWideButton` + icon variants
- [ ] Small circle/square/text-number buttons + rounded variants
- [ ] Left/right/top/bottom rounded wide buttons
- [ ] `TOGToggle`, `TOGToggleVisited`
- [ ] `BUTDDMList`, `BUTDDMListAction`, `BUTDDMListActionDual`
- [ ] `BUTVisitStatusButton`, `BUTTwoButtonBar`, `BUTThreeButtonBar`
- [ ] `BUTHeaderLink`, `BUTFooterLink`, `NavLink`, `BUTLink`
- [ ] `index.ts` barrel export preserved

**textInputs/ + textInputButtons/**
- [ ] Plain / icon / label / special (search, price, icon-label bar) variants
- [ ] Wide / squared / rounded shape variants

**cards/**
- [ ] `StationCard` (placeholder/mock data)
- [ ] `LightRailStopCard` (placeholder/mock data)
- [ ] `StationsTableView` (placeholder/mock data)
- [ ] `NetworkStationTabGroup`
- [ ] `StationAdminControls` (visual shell only — no live actions)
- [ ] `TextCard`, `SelectionDot`

**chips/**
- [ ] `LightRailLineChips`, `LightRailLineStrip`
- [ ] `LightRailPlatformsChipPicker`, `LightRailLinesServedChipPicker`

**maps/** — see §5.7 Leaflet decision below
- [ ] `StationsOsmMap` ported with client-only dynamic import, wired to **sample** `stations.json` (see below)
- [ ] `StationsMapTimeline` (placeholder data)
- [ ] `StationsMapSelectedPanel` (placeholder data)
- [ ] `MapAddStationContextMenu` — visual shell only, no real add-station flow (that's `/admin/map` in Phase 2)

**heros/**
- [ ] `CarouselHero` (full video carousel, all real media copied)
- [ ] `StaticHero`
- [ ] `HeroImageStack`

**models/** (modals/forms) — visual shells, no live submit logic
- [ ] `StationModal`, `StationEditModal`, `NewStationModal`, `ChooseNetworkForNewStationModal`
- [ ] `PendingChangesActionModal`, `PendingChangesReviewPanel`
- [ ] `StationDetailsView`/`EditForm`, `NewStationForm`
- [ ] `LocationMapPicker` (map picker shell, sample data)
- [ ] `HomeDownloadPlatformModal`

**misc/**
- [ ] `Header` (full nav — see §5.5)
- [ ] `Footer` (full nav — see §5.5)
- [ ] `PageTopHeader`
- [ ] `BetaTag`
- [ ] `ScrollFadeReveal`

**firebase/** — placeholders only (no real Firebase calls in Phase 1)
- [ ] `ProtectedRoute` — stubbed as pass-through / always-allow in Phase 1, real logic wired in Phase 2
- [ ] `FirebaseReauthPanel`, `PasswordReauthModal` — visual shells only

**darwin/** — placeholders only (no live Darwin API calls in Phase 1)
- [ ] `CarriageMap`, `StationMessages`, `ActivityPill`, `DataLicenceAttribution` — built with mock/sample data

### 5.5 Header & Footer
- [ ] `Header`: fixed top nav, logo, desktop links, mobile hamburger, `BUTHeaderLink`, `BetaTag` on Map link — full port
- [ ] Auth-dependent links (Stations, Messages) shown in a **logged-out placeholder state** since real auth state doesn't exist yet in Phase 1 (i.e. render as if no user is signed in; this is visually correct and avoids building fake auth state machinery)
- [ ] `Footer`: copyright, Home/Migration/Privacy/EULA, Log in/Log out (shown logged-out), theme toggle (sun/moon SVG, fully functional since it's pure client-side/localStorage), logged-in second row (Stations, API Status, Design System, Admin toggle) — build but keep hidden/inactive until Phase 2 auth exists

### 5.6 Homepage
- [ ] Full port of `HomePage`, including the hero carousel video system (all `hero1`–`hero9` mp4/webm, light/dark, desktop/tablet-mobile variants copied to `New Site/public/media/home/`)
- [ ] All homepage CTAs/links wired to correct new routes (e.g. links to `/stations/map`, `/migration`, `/log-in`)

### 5.7 Placeholder Stations page and Placeholder Map page

- [ ] **`/admin/stations`** — placeholder shell: correct layout, header, table/card views (`StationsTableView`, `StationCard`) populated with a small hardcoded/mock dataset shaped like real station data, so the visual design can be validated. No Firestore connection, no edit/save actions wired.
- [ ] **`/stations/map`** — recommended approach: **wire Leaflet + OSM tiles for real, using the existing sample `public/data/stations.json`** (copied verbatim into `New Site/public/data/`) as the data source, rather than a static screenshot or fully-deferred stub. This gives a realistic, interactive placeholder (pan/zoom/markers/popups all work) while deferring only the **live Firestore data** and **admin add/edit overlay** (`/admin/map`) to Phase 2. Rationale: Leaflet's map-rendering logic, the OSM tile proxy route, and `leaflet.vectorgrid` railway overlay are all framework-integration risk (client-only rendering, dynamic import, SSR guards) that's better to de-risk early in Phase 1 rather than bundling it with the Firestore integration work in Phase 2.
- [ ] `/admin/map` — not built in Phase 1 (Phase 2 item), route can exist as a bare placeholder page or simply be omitted until Phase 2.

### 5.8 Favicon & metadata/manifest
- [ ] Copy `favicon.svg`, `favicon.png`, `apple-touch-icon.png`, `pwa-192x192.png` into `New Site/public/`
- [ ] Recreate `<head>` metadata via Next.js `app/layout.tsx` `metadata` export (title, description, icons, cache-busting equivalents)
- [ ] `manifest.json`/PWA manifest fields ported (full Workbox service-worker behavior deferred to Phase 2, see §6)

### 5.9 Media & fonts
- [ ] Copy all ~226MB of `public/media/home/` hero videos (mp4 + webm, light/dark, desktop/tablet-mobile, hero1–9)
- [ ] Copy all `public/fonts/` (Geologica + Aronetiv, 6 files, ~476KB)
- [ ] Copy `public/images/` (SVG logo)
- [ ] Copy `public/data/stations.json`, `stations-sample.json`, `stats.json` (used as Phase 1 placeholder/sample data sources)

### 5.10 Legal pages
- [ ] `/privacy` and `/eula` — ported as static content in Phase 1 (flagged as an assumption in §8 — these are simple, static, and low-risk, so including them early is proposed rather than strictly requested)

### 5.11 Explicitly OUT of scope for Phase 1
- Firebase Auth (email/password, Google/Apple OAuth, email verification, TOTP MFA)
- Firestore (no live station data, no pending changes, no scheduled publish jobs)
- Firebase Storage (Message Centre images)
- App Check, Analytics
- Migration tool (`/migration`) full functionality — CSV upload/parsing/matching logic
- Message Centre (`/admin/messages/*`)
- Departures/Services/Units (Darwin-powered pages) — real API data
- API Status page (`/admin/api-status`) real functionality
- All admin editing workflows (add/edit/delete stations, pending changes review, map admin overlay)
- TOTP MFA enrollment/challenge flows
- **Login page real functionality** — recommendation: build the **UI shell only** in Phase 1 (form layout, field styling, OAuth button styling, matching `LoginPage.tsx`'s visual structure) with submit handlers stubbed as no-ops or console logs. This lets the page be visually reviewed alongside everything else without pulling Firebase Auth into Phase 1. Full wiring (email/password, Google/Apple redirect, email verification gate, mandatory TOTP enrollment, redirect to `/admin/stations` on success) is a Phase 2 item.
- Firebase Cloud Functions (`stationScheduledPublish.ts`, `onNewStationAdded.ts`, `stationCollectionIds.ts`) — untouched, deployed separately regardless of frontend framework
- Netlify Function → Route Handler conversion for `darwin-proxy` (needs live Darwin credentials) — though `osm-tile` and `nominatim-proxy` Route Handlers *can* be stood up in Phase 1 since the map placeholder needs them

### 5.12 Phase 1 acceptance checklist (for user sign-off)
- [ ] All routes in the "P1" column of the route map (§4) exist and render without errors
- [ ] Design tokens verified pixel-for-pixel against old site in both light and dark theme
- [ ] Theme toggle persists correctly across reloads (`localStorage`)
- [ ] Header/Footer nav matches old site (logged-out state acceptable per §5.5)
- [ ] Homepage hero carousel plays correctly, light/dark variants swap correctly, desktop vs. tablet-mobile breakpoints behave correctly
- [ ] All 7 design system sections render and are visually complete
- [ ] `/buttons` public demo matches `/admin/design-system/buttons`
- [ ] Placeholder `/admin/stations` renders mock data with correct card/table layouts
- [ ] `/stations/map` renders an interactive Leaflet map with sample station markers, OSM tiles loading via the new Route Handler proxy
- [ ] Login page UI shell matches old site visually (no functional auth expected)
- [ ] Legal pages (`/privacy`, `/eula`) render correctly
- [ ] Favicons/PWA icons present and correct
- [ ] No console errors related to missing Firebase config (Firebase SDK should not be initialized at all in Phase 1, or initialized in a clearly inert/no-op state)
- [ ] **User has reviewed the above and explicitly approved moving to Phase 2**

---

## 6. Phase 2 Scope — Full Functionality

Phase 2 begins **only after explicit Phase 1 sign-off** (see §7). Checklist:

- [ ] **Firebase integration**: initialize Firebase SDK for real (`src/services/firebase.ts` ~1102 lines ported), Auth (email/password, Google redirect, Apple redirect, email verification), Firestore (all station collections: `stations_gbnr`, `stations_nitranslink`, `stations_roiirerail`, `stations_gbheritage`, `lightrail_GBSHEFFSUPERTRAM`, `newsandboxstations1`, plus `scheduledStationPublishJobs`, `inAppMessages`), Storage (Message Centre images), App Check (reCAPTCHA v3), Analytics (lazy/optional), emulator support (`NEXT_PUBLIC_USE_FIREBASE_EMULATOR`)
- [ ] TOTP MFA (`firebaseTotpMfa.ts` equivalent + `qrcode` package) — mandatory enrollment + challenge flow
- [ ] Real `ProtectedRoute` logic wired into `app/admin/layout.tsx` (or per-section layouts): signed-in + verified email + TOTP enrolled, with dev bypass equivalent (`NEXT_PUBLIC_LOCAL_DEV_LOGIN_BYPASS`)
- [ ] Real `/log-in` page: full `LoginPage.tsx` (~602 lines) port — email/password, Google/Apple OAuth redirect, email verification gate, mandatory TOTP enrollment/challenge, redirect to `/admin/stations` on success
- [ ] Real `/admin/stations` (list/admin) using `useStations()` hook ported, live Firestore data, fallback to `public/data/stations.json` via `NEXT_PUBLIC_USE_LOCAL_DATA_ONLY`
- [ ] `/admin/stations/pending-review`, `/admin/stations/new`, `/admin/stations/:network/:stationSlug/edit` — full CRUD + pending-change review workflows
- [ ] Public station detail pages (`/stations/:network/:stationSlug`, `/stations/:legacyStationId` redirect) wired to live Firestore
- [ ] Real `/stations/map` with live Firestore data replacing sample JSON; `/admin/map` built with admin add/edit overlay (`MapAddStationContextMenu`, admin controls) split out from the public viewer
- [ ] Full Migration tool port (`MigrationPage.tsx` ~2722 lines + ~6165 lines CSS, `migration.ts` service ~1272 lines): CSV upload, auto-format-detection (3 formats), column mapping UI, Firestore station matching, manual correction, converted CSV download — **staying public at `/migration`, no login wall**, per clarified decision
- [ ] Message Centre at `/admin/messages`, `/admin/messages/new`, `/admin/messages/:messageId` (Storage-backed images via `messageCentre.ts`)
- [ ] Darwin-powered pages: `/departures`, `/departures/:code`, `/services/:rid`, `/units`, `/units/:unitId` — wired to the new `darwin-proxy` Route Handler (`app/api/darwin/route.ts` or similar), carrying over `CarriageMap`, `StationMessages`, `ActivityPill`, `DataLicenceAttribution` with real data
- [ ] `/admin/api-status` — real API/service health checks (pending confirmation of rename, §8)
- [ ] Firebase Cloud Functions carried over unchanged: `stationScheduledPublish.ts`, `onNewStationAdded.ts`, `stationCollectionIds.ts` (deploy pipeline unaffected by frontend migration)
- [ ] **Security rules parity check**: diff `firestore.rules`, `storage.rules`, `firestore.indexes.json` against old site to confirm no accidental regression — these are Firebase-side artifacts and should be reusable largely as-is, but must be re-verified against any new admin route structure assumptions
- [ ] PWA/service worker setup: recreate `vite-plugin-pwa`/Workbox behavior using a Next.js-compatible approach (e.g. `next-pwa`/`@ducanh2912/next-pwa` or a hand-rolled service worker), manifest finalized
- [ ] Final `/admin/*` URL cutover: confirm all internal links across the app point to final admin paths
- [ ] **Redirects from old URLs**: add redirects (via `next.config.js` `redirects()` or `middleware.ts`) for bookmarked old links, e.g. `/stations` → `/admin/stations`, `/stations/edit` → `/admin/stations`, `/design-system` → `/admin/design-system`, `/api-status` → `/admin/api-status` (if rename confirmed)
- [ ] Performance/SEO pass: Next.js `<Image>`/video optimization audit (see risk notes §9), metadata/OpenGraph tags, sitemap
- [ ] Analytics parity check: confirm Firebase Analytics events fire equivalently to old site

---

## 7. Explicit Approval Gate

**Work stops after Phase 1 for user review.** No Phase 2 work — including any Firebase wiring, real authentication, live data, or admin functionality — will begin until the user has reviewed the Phase 1 build against the acceptance checklist in §5.12 and **explicitly confirmed that Phase 1 is correct with no outstanding issues**. This gate exists specifically so that visual/structural fidelity is locked in before backend complexity (which is harder to visually diff) is introduced.

---

## 8. Open Assumptions — confirmed (7 Jul 2026)

- [x] **`/api-status` → `/admin/api-status` rename** — confirmed; redirects in `next.config.ts`.
- [x] **Design System auth gating in Phase 1** — Option A (ungated in Phase 1); real `ProtectedRoute` via `app/admin/layout.tsx` in Phase 2.
- [x] **Legal pages in Phase 1** — confirmed.
- [x] **Login page shell scope** — confirmed; full auth wired in Phase 2.
- [x] **Leaflet + sample data in Phase 1** — confirmed; live Firestore in Phase 2.
- [x] **Netlify Functions → Route Handlers** — OSM, Nominatim, and Darwin proxies under `app/api/*`.

---

## 9. Risk Notes

- **226MB of video assets**: the hero carousel media (93 files across `hero1`–`hero9`, light/dark, desktop/tablet-mobile) is a large payload. Next.js doesn't have a built-in video-optimization pipeline equivalent to `next/image` — videos should continue to be served as static assets from `public/`, but consider: (a) confirming Netlify's build/deploy size limits accommodate this, (b) evaluating whether a CDN/media host (e.g. Cloudinary, Mux, or Netlify Large Media) would reduce repo/deploy bloat, though this is out of scope unless the user wants to revisit it. `next/image` should still be used for the static image assets (logos, favicons) to get automatic optimization there.
- **TOTP MFA + App Check SSR/hydration considerations (Phase 2)**: Firebase Auth's multi-factor APIs and App Check (reCAPTCheck v3) are browser-only and stateful; they must be initialized client-side only (guarded from running during SSR/build), and any hydration mismatch risk (e.g. rendering different UI based on auth state before the client has resolved it) needs a loading/skeleton state rather than conditional SSR output, to avoid hydration errors.
- **Leaflet + Next.js SSR considerations**: Leaflet (and `leaflet.vectorgrid`) directly manipulate the DOM and reference `window`/`document` at import time, which breaks in a Node/SSR environment. All map components (`StationsOsmMap` and dependents) must be loaded via `next/dynamic` with `{ ssr: false }`, and the railway overlay logic (`railwayOverlay.ts` equivalent) must only run client-side. This applies in both Phase 1 (sample data) and Phase 2 (live data).
- **Firestore security rules parity**: `firestore.rules` and `storage.rules` are Firebase-side and framework-agnostic, so they largely carry over unchanged — but the new `/admin/*` URL restructuring is a *client-side routing* concern only and must not be mistaken for actual security. Firestore/Storage access control must continue to be enforced entirely by the rules files themselves (as today), not by which Next.js route a user navigated through. A rules parity review is called out explicitly in §6 to avoid any false sense of security from the new URL structure.
