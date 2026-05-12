# Portugal Absence Tracker

A privacy-first PWA for foreign residents of Portugal to track absence days against the Article 85
limits of Lei n.º 23/2007. All data stays on your device.

Live: <https://portugal-absence-tracker.pages.dev/>

> The IndexedDB database name remains `pt-residence-tracker` from before the
> rename so existing user data (cards, trips, settings) carries over seamlessly.
> See `src/lib/db/schema.ts` for the explicit DO-NOT-CHANGE comment.

## Stack

SvelteKit · Svelte 5 runes · TypeScript · Tailwind v4 · Dexie 4 · date-fns · Vitest · Playwright.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run test         # unit + repository tests
npm run test:e2e     # Playwright golden path
npm run build        # static build → ./build
```

## Deploy

The build is fully static. Drag-and-drop `build/` to Cloudflare Pages, Netlify, Vercel, or any
static host. No server, no accounts.

### Optional: Cloudflare Web Analytics

If you want basic visit counts (privacy-friendly — no cookies, no fingerprinting, no consent
banner needed), set the build-time env var `PUBLIC_CF_ANALYTICS_TOKEN` to your Cloudflare Web
Analytics site token. When set, the layout injects the CWA beacon; when unset, no analytics load
and the app makes no third-party network calls. See `.env.example`.

## Privacy

All residence-card details, trip dates, destinations, purposes, and notes live in your
browser's IndexedDB and never leave the device. The app makes no third-party network calls
at runtime by default.

If you enable Cloudflare Web Analytics (above), only aggregate signals are recorded — visits,
device class, approximate country, and per-day unique-visitor counts. No travel or residence
data is ever sent.

## Spec & plan

### v1 — initial implementation (2026-05-11)

- [Design spec](docs/superpowers/specs/2026-05-10-portugal-residence-tracker-design.md)
- [Implementation plan](docs/superpowers/plans/2026-05-10-portugal-residence-tracker.md)

### v1.1 — Trip model redesign (2026-05-12)

- [Redesign spec](docs/superpowers/specs/2026-05-12-trip-model-redesign-design.md)
- [Redesign plan](docs/superpowers/plans/2026-05-12-trip-model-redesign.md)

v1.1 introduces two-interval absences (Portugal + Schengen), multi-country trips,
multi-select purposes, and a simpler form. Existing v1 data migrates losslessly.

## Disclaimer

Not legal advice. Consult AIMA or a licensed Portuguese immigration attorney for decisions
affecting your residency status.
