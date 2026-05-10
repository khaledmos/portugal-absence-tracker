# Portugal Residence Permit Absence Tracker — Design

**Date:** 2026-05-10
**Status:** Design approved (pending spec review). Implementation plan to follow.
**Audience:** Foreigners holding Portuguese residence permits (D-type visas, family reunification, student, worker, CPLP, etc. — collectively "Other Residence Permits").

## 1. Purpose

Help foreign residents of Portugal track how many days they have been (and plan to be) absent from Portugal, and whether they are at risk of breaching the legal limits that can lead to cancellation of their residence permit under Article 85 of Lei n.º 23/2007 (the Aliens Act).

The user enters their residence card validity period(s) and their trips. The app computes:

1. Total **interpolated** absence days (cumulative across all trips, within card validity).
2. Longest **consecutive** absence streak.
3. Both metrics in two scopes side-by-side: **Portugal** (any day outside Portugal counts) and **Schengen** (only days outside the Schengen Area count).
4. Projection of the same metrics if the user's planned future trips happen.
5. A simulator for hypothetical trips ("what if I go to Bangkok for 21 days in October?").

## 2. Scope

### In scope (v1)

- Card management (CRUD) for "Other Residence Permit" types: Initial 2-yr, Subsequent 3-yr, Permanent 5-yr.
- Trip management (CRUD) with past + planned status.
- Pure-function calculation engine implementing Article 85.2.
- Dashboard, Trips list & form, Cards list & form, Simulator, Settings.
- Local-only storage in IndexedDB.
- JSON export / import for backup.
- Installable PWA with offline support.
- Static-hostable single-page app (no server, no accounts, no analytics).
- "Hybrid" auto-flip for planned trips: when the return date passes, status flips to `past` and a `needsReview` flag is set; user is prompted to confirm.

### Explicitly out of scope (v1)

- **Auto-detection from email / booking confirmations / calendar imports.** Captured as a v2 feature; the v1 data model already supports it (trips are independent of how they were captured), so v2 is additive.
- **Golden Visa permit type.** Different rule path; can be added later as a new permit-type case.
- **Cross-device sync, accounts, cloud backup.** No backend in v1.
- **Push notifications / scheduled reminders.** PWA install prompt only.
- **Multi-language UI.** English only in v1 (with permit-type names and disclaimers cross-referenced to Portuguese law).
- **Article 85.4 automatic exemption.** Tagged trips are surfaced as "may be defensible" but never excluded from the count automatically — Article 85.4 is a defense, not a counting rule.

## 3. Regulatory background

### The legally enforceable rule (Article 85.2 of Lei n.º 23/2007)

A residence permit may be cancelled when the holder, without relevant reasons, is absent from Portugal:

- **Temporary residence permit (Initial 2-yr or Subsequent 3-yr):** more than 6 consecutive months OR 8 interpolated months in the total period of validity.
- **Permanent residence permit (5-yr):** more than 24 consecutive months OR 30 interpolated months in any 3-year period.

### Article 85.4 — defence against cancellation

Cancellation is not enforced when the absent person can prove they were engaged in *professional, business, cultural, or social activity* during the absence. This is a defence at the moment of enforcement, not an automatic exclusion from the day count.

### The minimum-stay table (informational only)

A widely-circulated table phrases the same rules as a minimum *presence* requirement (e.g., 28 months of presence in any 3-year subsequent permit). Per the source PDF, the per-permit-type minimum-stay rules are not consistently enforced and have been called into question on EU freedom-of-movement grounds. The app surfaces this table as informational text in Settings, but the **engine is anchored to Article 85.2**.

### Day-conversion convention

Portuguese law expresses limits in months. The Civil Code (Article 279(c)) defines month-based periods to end on the corresponding date in the Nth month. The app applies that convention precisely for the *consecutive* limit, and uses a documented day approximation for the *interpolated* limit:

| Limit | Day calculation | Notes |
| --- | --- | --- |
| Consecutive 6 months (temporary) | `addMonths(departure, 6)` — exact calendar date | The hard limit is a specific date for each absence streak. |
| Consecutive 24 months (permanent) | `addMonths(departure, 24)` — exact calendar date | Same. |
| Interpolated 8 months (temporary) | 8 × 30.4375 ≈ **244 days** | Average month length. Displayed as "≈ 244 days". |
| Interpolated 30 months / 3 yrs (permanent) | 30 × 30.4375 ≈ **913 days** | Same. |

This convention is documented in the Settings → About panel for full transparency.

### Day-counting convention (per trip)

Default: **departure day = absent, return day = present in PT.** A trip from D to R counts (R − D) days as absent.

- Example: depart Jan 15, return Jan 18 → 3 absence days (Jan 15, 16, 17).
- User-changeable in Settings to `inclusive_both` (4 days, conservative — matches Schengen 90/180 convention) or `exclusive_both` (2 days, lenient).

### The Portugal vs Schengen distinction

Article 85 measures *absence from Portugal*, not from Schengen. In strict reading, a Lisbon→Madrid weekend is absence. In practice, AIMA can usually only prove absences via passport stamps, which exist only on Schengen-external borders. The app reports both metrics so the user can see the strict and the practically-enforceable numbers side-by-side.

### Disclaimer

The app is an unofficial planning tool. It is not legal advice. The disclaimer is shown on first launch and in Settings → About: *"For decisions affecting your residency status, consult AIMA or a licensed Portuguese immigration attorney."*

## 4. Architecture

- Pure client-side **SvelteKit** PWA (Svelte 5 with runes).
- **TypeScript** strict mode.
- **Static** build via `@sveltejs/adapter-static`. Hosting target: Cloudflare Pages (free, edge CDN, custom domain). Compatible with Netlify, Vercel, GitHub Pages.
- **No backend, no accounts, no telemetry.** Each user runs an isolated instance in their browser.
- **IndexedDB** via **Dexie 4** for local persistence.
- **Service worker** via **`@vite-pwa/sveltekit`** for offline support, install prompt, and update lifecycle.
- **Tailwind CSS v4** for styling. No external UI library.
- **date-fns** for all date arithmetic (`addMonths`, `differenceInDays`, `eachDayOfInterval`).

### Project layout

```
src/
  lib/
    domain/         # Pure types: Card, Trip, Settings, country lookup, permit-type rules
    engine/         # Absence calculator (PURE FUNCTIONS, fully unit-tested)
    db/             # Dexie schema, repositories, migrations
    stores/         # Svelte stores wrapping the repos (reactive UI bindings)
    components/     # UI components
  routes/
    +layout.svelte  # nav, theme, persistent-storage prompt, disclaimer modal
    +page.svelte    # dashboard
    trips/+page.svelte
    cards/+page.svelte
    simulate/+page.svelte
    settings/+page.svelte
static/
  manifest.webmanifest
  icons/
tests/
  engine.test.ts    # Calculation correctness fixtures
  db.test.ts        # Repository and migration tests
  e2e/              # Playwright end-to-end flows
docs/
  superpowers/
    specs/          # Design and plan documents
```

## 5. Data model

```ts
type Card = {
  id: string;                        // uuid
  label: string;                     // user-given, e.g. "2nd card"
  type: 'initial_2yr' | 'subsequent_3yr' | 'permanent_5yr';
  issuedDate: ISODate;               // YYYY-MM-DD
  expiryDate: ISODate;               // YYYY-MM-DD
  notes?: string;
  archived?: boolean;                // hide from active lists; preserve for history
};

type Trip = {
  id: string;
  departureDate: ISODate;
  returnDate: ISODate;
  destinationCountry: string;        // ISO 3166-1 alpha-2 code
  destinationCity?: string;
  departureAirport?: string;         // IATA or port code
  arrivalAirport?: string;
  status: 'past' | 'planned';
  needsReview?: boolean;             // set when auto-flipped from planned to past
  purpose?: 'business' | 'work' | 'cultural' | 'social' | 'personal' | 'medical';
  notes?: string;
};

type Settings = {
  daycountConvention: 'standard' | 'inclusive_both' | 'exclusive_both';
  // 'standard' = R − D days absent (default)
  // 'inclusive_both' = R − D + 1 days (conservative; matches Schengen 90/180)
  // 'exclusive_both' = R − D − 1 days (lenient)
  defaultScopeView: 'portugal' | 'schengen' | 'both';
  lastBackupAt?: ISODate;
  acceptedDisclaimerAt?: ISODate;
};

type CountryRecord = {
  code: string;                      // ISO 3166-1 alpha-2
  name: string;                      // English
  flag: string;                      // emoji
  isSchengen: boolean;
};
```

Notes:

- `isWithinSchengen` is **derived** from `destinationCountry` against the static country table — never stored, always computed.
- `purpose` is informational only — does not affect counters.
- Cards are stored as a list. The "active" card is the one whose `[issuedDate, expiryDate]` window contains today. There may be zero (gap) or rarely two (overlap) — both cases are handled.
- Trips are stored once. Calculation clips each trip to each card's validity window; one trip can contribute to two cards' counters.
- Country table is a static JSON file shipped in the bundle (~250 entries) — fully offline.

## 6. Calculation engine

The engine is a set of **pure functions** taking `(cards, trips, today, settings)` and returning derived numbers. No DB calls, no Svelte. Fully unit-testable in milliseconds.

### Inputs and outputs

```ts
function computeCardCompliance(input: {
  card: Card;
  trips: Trip[];
  today: ISODate;
  settings: Settings;
}): CardCompliance;

type CardCompliance = {
  cardId: string;

  validityDays: number;              // total days in card window
  elapsedDays: number;                // days from issue to today, clipped to [0, validityDays]

  portugal: ScopeCompliance;
  schengen: ScopeCompliance;
};

type ScopeCompliance = {
  consecutive: {
    used: number;                     // longest consecutive absence streak so far (days)
    budgetMonths: number;             // 6 or 24
    limitDate?: ISODate;              // current ongoing streak's hard limit, if currently abroad
    currentlyAbroad: boolean;
    currentStreakDays?: number;
  };
  interpolated: {
    used: number;                     // total interpolated absence days
    budgetDays: number;               // 244 or 913 depending on permit type
    budgetMonthsLabel: string;        // "8 months (≈244 days)"
  };
  projectedAfterPlanned: {
    consecutiveUsed: number;
    interpolatedUsed: number;
  };
};
```

### Algorithm

1. **Filter trips** to those overlapping the card's validity window.
2. For each trip, **clip** to `[card.issuedDate, card.expiryDate]`.
3. Convert each clipped trip to an absent-days set using `daycountConvention`.
4. Within each scope (Portugal / Schengen), include or exclude the trip based on `destinationCountry`.
5. **Interpolated** = cardinality of the union of absent-days sets for past trips. (Planned trips counted separately for `projectedAfterPlanned`.)
6. **Consecutive** = longest run of contiguous absent days, considering trips within the scope. Bridges across back-to-back trips with same-day return-and-depart.
7. If today falls inside a past or auto-flipped trip's window, mark `currentlyAbroad: true` and compute `currentStreakDays` and `limitDate`.

### Per-permit-type budgets

| Permit type | Consecutive limit | Interpolated budget |
| --- | --- | --- |
| `initial_2yr` | 6 months (`addMonths(departure, 6)`) | 244 days (≈ 8 months) |
| `subsequent_3yr` | 6 months | 244 days (≈ 8 months) |
| `permanent_5yr` | 24 months | 913 days (≈ 30 months) **per any 3-year window** |

For permanent permits, the "any 3-year window" rule is implemented as a sliding window over the card's validity, recomputing the maximum interpolated value across all valid 3-year windows.

### Test strategy (engine)

Calculation correctness is the core of the product. The engine has its own test file with named fixtures covering:

- Khaled's actual case (2025-08-01 → 2028-01-31, subsequent_3yr).
- Card-boundary trips (clipped on each side).
- Currently-abroad streak detection.
- Same-day return-and-depart bridging.
- Schengen-internal trips contributing to Portugal but not Schengen.
- Day-counting convention switches.
- Leap-year boundaries.
- Interpolated 3-year window for permanent permits.
- Auto-flipped trips (`needsReview: true` still count).
- Empty trip list, single trip, hundreds of trips.

Vitest runs against pure functions; no DOM or DB needed.

## 7. UI design

Five top-level routes; navigation surface is a bottom tab bar on mobile and a sidebar on desktop.

### Dashboard (`/`)

- Active card pill with type, validity dates, "X / Y days elapsed" progress.
- Conditional "currently abroad" alert banner (orange) — visible only when a trip's window contains today.
- Toggle: **As of today** / **Projected (incl. planned)**.
- Two side-by-side tiles: **Portugal absence** / **Schengen absence**, each with `used / budget`, days remaining, sub-label, color-coded progress bar (green / amber / red bands).
- Longest-consecutive-streak row tile.
- Card-validity timeline strip with past trips (solid blue), planned trips (dashed light blue), today marker (red line), card start/end labels.
- Footer: legal disclaimer link.

### Trips (`/trips`)

- List of past + planned trips, today divider in the middle, optional filter chips (All / Past / Planned / Outside Schengen).
- Each row: country flag + city, day count, dates + airports, scope tag (Schengen / Outside Schengen), purpose tag.
- Row whose dates contain today is highlighted with the orange "currently" treatment.
- Auto-flipped trips show a small ⚠️ chip until reviewed.
- Add/edit form (modal or separate page): status pill, dates, country (autocomplete from the static table), city, airports, purpose pill row, notes, **live "Impact preview"** showing the trip's effect on counters.
- One-tap "Mark as taken" appears for planned trips whose return date has passed.

### Cards (`/cards`)

- List with active card highlighted (green border + soft gradient).
- Each row shows compliance summary inline.
- Past cards are faded with a final outcome ("Compliant ✓" or warning).
- Future placeholder cards (dashed border) for renewals not yet issued.
- Add/edit form: label, permit type, issued date, expiry date, notes.

### Simulator (`/simulate`)

- Hypothetical trip form (dates + destination).
- "Impact" card: every metric shown as `now → after` with delta chips.
- Green "within limits" banner when safe; red warning banner identifying which limit would be exceeded and by how much.
- Buttons: "Save as planned trip" (creates a Trip with status `planned`) or "Reset".

### Settings (`/settings`)

- Day-counting convention picker.
- Default scope view (Portugal / Schengen / Both).
- Backup section: Export JSON, Import JSON, last-backup date with reminder if > 14 days.
- About: regulations summary (Article 85.2 verbatim), day-conversion convention disclosure, link to source PDF, version, full disclaimer text, "this is not legal advice".

### Visual style

- Mobile-first. Touch targets ≥ 44px.
- System dark/light mode via Tailwind.
- Country names spelled out in full ("Portugal", "Schengen") rather than abbreviations.

## 8. Persistence and backup

### Browser storage caveats

- **iOS Safari** can evict IndexedDB after ~7 days of non-use unless the app is added to the home screen.
- **Chromium / Firefox** respect `navigator.storage.persist()` — request on launch.

### Mitigations

- First-launch onboarding warns about this and walks the user through "Add to Home Screen" on iOS.
- `navigator.storage.persist()` requested on first save.
- Dashboard "Last backup: N days ago" indicator.
- Non-blocking banner suggests a backup if no export in the last 14 days.

### Export format

JSON file containing a versioned envelope:

```jsonc
{
  "schemaVersion": 1,
  "exportedAt": "2026-05-10T12:34:56Z",
  "cards": [...],
  "trips": [...],
  "settings": {...}
}
```

Import validates `schemaVersion` and runs migrations if older. No encryption — data is mundane.

## 9. Tech stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | SvelteKit (Svelte 5, runes) | `$state`, `$derived`, `$effect` |
| Language | TypeScript strict | |
| Build | Vite (built into SvelteKit) | |
| Adapter | `@sveltejs/adapter-static` | Pure static output |
| Storage | Dexie 4 | Typed IndexedDB |
| Date math | date-fns | Tree-shakable |
| UI | Tailwind CSS v4 | No external UI library |
| Charting | Hand-rolled SVG (timeline strip) | Tiny |
| PWA | `@vite-pwa/sveltekit` | Service worker + manifest |
| Country data | Static JSON in bundle | Offline |
| Unit tests | Vitest | Engine, repositories |
| E2E tests | Playwright | Critical user flows |
| Lint/format | ESLint + Prettier | |
| Hosting | Cloudflare Pages (recommended) | Free, edge CDN |

## 10. Development tools (skills)

- **`svelte-code-writer`** — every `.svelte` and `.svelte.ts` file is run through `svelte-autofixer` before being marked complete. Documentation lookups via `npx @sveltejs/mcp list-sections` / `get-documentation` whenever runes / async / SSR semantics are uncertain.
- **`secondsky/claude-skills@tailwind-v4-shadcn`** — Tailwind v4 syntax reference (significantly different from v3).
- **`microsoft/playwright-cli@playwright-cli`** — Playwright test authoring and runner usage.
- **`currents-dev/playwright-best-practices-skill@playwright-best-practices`** — testing patterns.
- **`find-skills`** — used during implementation to surface additional skills as new questions emerge.
- Superpowers: **`test-driven-development`**, **`systematic-debugging`**, **`writing-plans`**, **`executing-plans`**, **`verification-before-completion`** as part of the workflow.

## 11. Testing strategy

- **Calculation engine**: dozens of fixture-based unit tests in Vitest. Pure functions, no DOM.
- **Repositories**: mocked Dexie, schema migration test.
- **UI components**: Svelte 5 unit tests where logic is non-trivial.
- **E2E**: Playwright covering golden paths — first-run onboarding, add card, add trip, check dashboard, run simulator, export & import JSON.
- **Manual**: real iOS Safari and Chrome installs to verify PWA install + IndexedDB persistence behaviour.

## 12. Open questions / future work

- **v2: auto-detection.** Email forwarding pipeline, Gmail/Outlook OAuth, AI-assisted parsing of booking confirmations, dedup logic against manually entered trips. Each of these is non-trivial and gets its own design.
- **Golden Visa permit type.** Different rule path; can be added by extending the permit-type enum and the `computeCardCompliance` rule table.
- **Notifications and reminders.** Web Push or local PWA scheduled reminders for "you'll cross the limit if your planned trip happens".
- **Localisation.** Portuguese and Arabic UI translations.
- **Multi-card report PDF.** Renewal-time summary showing compliance evidence for AIMA.

## 13. Definition of "v1 done"

- All five routes implemented with the validated layouts.
- Engine fixtures pass for the full suite.
- Playwright golden-path test passes in CI.
- App installs as a PWA on iOS Safari (verified manually) and Chrome desktop.
- JSON export and import round-trip a non-trivial dataset successfully.
- Disclaimer accepted and recorded on first launch.
- Static build deployable to Cloudflare Pages with a single command.

---

*Source PDF for regulations:* `Resource - Allowed Time Out of PT.pdf` (provided by Susan Stults Korthase for Americans & Friends in Portugal, 8 March 2021), interpreting Lei n.º 23/2007 Article 85.
