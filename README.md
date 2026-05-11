# Portugal Residence Tracker

A privacy-first PWA for foreign residents of Portugal to track absence days against the Article 85
limits of Lei n.º 23/2007. All data stays on your device.

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
static host. No server, no environment variables.

## Spec & plan

- [Design spec](docs/superpowers/specs/2026-05-10-portugal-residence-tracker-design.md)
- [Implementation plan](docs/superpowers/plans/2026-05-10-portugal-residence-tracker.md)

## Disclaimer

Not legal advice. Consult AIMA or a licensed Portuguese immigration attorney for decisions
affecting your residency status.
