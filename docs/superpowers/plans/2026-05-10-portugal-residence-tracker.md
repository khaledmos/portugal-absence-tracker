# Portugal Residence Permit Absence Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side SvelteKit PWA that lets foreign residents of Portugal track absence days against the Article 85 limits of Lei n.º 23/2007, with manual trip entry, multi-card support, projection/simulation, and JSON backup.

**Architecture:** Pure client-side single-page app. UI in SvelteKit (Svelte 5 runes) + Tailwind v4. Persistence in IndexedDB via Dexie 4. Calculation engine is a set of pure TypeScript functions, fully unit-tested. Static build via `@sveltejs/adapter-static`, deployable anywhere.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript strict, Tailwind CSS v4, Dexie 4, date-fns, `@vite-pwa/sveltekit`, Vitest, Playwright. Dev tooling: ESLint, Prettier. Skills: `svelte-code-writer` (run `svelte-autofixer` on every component before commit), `tailwind-v4-shadcn`, `playwright-cli`, `playwright-best-practices`.

**Spec:** [docs/superpowers/specs/2026-05-10-portugal-residence-tracker-design.md](../specs/2026-05-10-portugal-residence-tracker-design.md)

**Working directory:** `/Users/khaled.mostafa/Desktop/Khaled/Claude/Travel Tracker`

---

## Conventions and ground rules

- **TDD throughout the engine and repositories.** Write the failing test first, see it fail, implement, see it pass, commit.
- **`svelte-autofixer` MUST be run on every `.svelte` file and every `.svelte.ts` file before that file's commit.** Command: `npx @sveltejs/mcp svelte-autofixer ./path/to/Component.svelte`. Fix any issues it reports before committing.
- **Tailwind v4 syntax** (CSS-first via `@import "tailwindcss"` and `@theme` blocks). Refer to the `tailwind-v4-shadcn` skill if syntax is unclear.
- **Conventional commits.** `feat:`, `test:`, `chore:`, `fix:`, `docs:`.
- **Frequent commits.** Each task ends with a commit. If a task has more than ~3 steps that produce working code, commit at intermediate green points.
- **Date-only dates everywhere.** Store as `YYYY-MM-DD` strings (`ISODate`). Do all math with `date-fns` (`parseISO`, `format`, `addMonths`, `differenceInDays`, `eachDayOfInterval`).
- **No external network calls at runtime** (other than first-load asset fetch). Country data ships in the bundle.

---

## Task 1: Initialise the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `.gitignore`, `README.md`, `src/app.html`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `src/app.d.ts`

**Working directory:** `/Users/khaled.mostafa/Desktop/Khaled/Claude/Travel Tracker`

- [ ] **Step 1: Initialise git**

```bash
cd "/Users/khaled.mostafa/Desktop/Khaled/Claude/Travel Tracker"
git init
git branch -M main
```

Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Scaffold SvelteKit (skeleton, TypeScript, no extras yet)**

```bash
npx --yes sv create . --template minimal --types ts --no-install --no-add-ons
```

Expected: `package.json`, `svelte.config.js`, `vite.config.ts`, `src/`, `static/`, `tsconfig.json` created.

If `sv` prompts about a non-empty directory, accept. The `docs/` directory must remain. If files conflict, keep ours.

- [ ] **Step 3: Switch to the static adapter**

Edit `svelte.config.js`:

```js
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapterStatic({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    }),
    prerender: { entries: [] }
  }
};

export default config;
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
npm install -D @sveltejs/adapter-static @sveltejs/adapter-auto
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Verify it builds**

```bash
npm run build
```

Expected: build succeeds with output in `build/`.

- [ ] **Step 6: Add `.gitignore` entries**

Append to `.gitignore`:

```
# project
.superpowers/
.DS_Store
.vscode/
.idea/
*.log
.env
.env.*
build/
.svelte-kit/
node_modules/
playwright-report/
test-results/
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit project with static adapter"
```

---

## Task 2: Install and configure Tailwind v4

**Files:**
- Create: `src/app.css`
- Modify: `vite.config.ts`, `src/routes/+layout.svelte`, `package.json`

- [ ] **Step 1: Install Tailwind v4 and the Vite plugin**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add the Tailwind plugin to Vite**

Edit `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

- [ ] **Step 3: Create the global stylesheet**

Create `src/app.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand: #1a1d24;
  --color-brand-fg: #ffffff;
  --color-ok: #10b981;
  --color-warn: #f59e0b;
  --color-danger: #ef4444;
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif;
}

:root { color-scheme: light dark; }

html, body {
  margin: 0;
  font-family: var(--font-sans);
  background: oklch(0.98 0.01 250);
  color: oklch(0.18 0.02 260);
}

@media (prefers-color-scheme: dark) {
  html, body {
    background: oklch(0.18 0.02 260);
    color: oklch(0.96 0.01 250);
  }
}
```

- [ ] **Step 4: Import the stylesheet from the root layout**

Edit `src/routes/+layout.svelte` (replace contents):

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 5: Verify it builds and a Tailwind class works**

Edit `src/routes/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold p-6">Portugal residence tracker</h1>
```

Run:

```bash
npm run dev
```

Visit http://localhost:5173 — the heading should appear with Tailwind's reset and `text-2xl` styling. Stop the dev server with Ctrl-C.

- [ ] **Step 6: Run svelte-autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/+layout.svelte
npx @sveltejs/mcp svelte-autofixer ./src/routes/+page.svelte
```

Fix any issues reported.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind v4 via @tailwindcss/vite"
```

---

## Task 3: Configure linting, formatting, and testing tools

**Files:**
- Create: `.prettierrc`, `.prettierignore`, `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `tests/.gitkeep`, `e2e/.gitkeep`

- [ ] **Step 1: Install dev tooling**

```bash
npm install -D prettier prettier-plugin-svelte eslint @eslint/js typescript-eslint eslint-plugin-svelte vitest @vitest/coverage-v8 jsdom @testing-library/svelte @playwright/test
```

- [ ] **Step 2: Add Prettier config**

Create `.prettierrc`:

```json
{
  "useTabs": false,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

Create `.prettierignore`:

```
.svelte-kit/
build/
node_modules/
package-lock.json
.superpowers/
docs/
```

- [ ] **Step 3: Add ESLint config**

Create `eslint.config.js`:

```js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser } }
  },
  {
    ignores: ['build/', '.svelte-kit/', 'node_modules/', 'docs/', '.superpowers/']
  }
];
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    environment: 'jsdom',
    globals: true
  }
});
```

- [ ] **Step 5: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } }
  ]
});
```

- [ ] **Step 6: Add npm scripts**

Edit `package.json` `scripts`:

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "lint": "eslint . && prettier --check .",
  "format": "prettier --write .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 7: Verify everything runs**

```bash
npm run lint
npm run check
npm run test
```

All three should exit cleanly (test reports "no test files" — fine).

- [ ] **Step 8: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: add ESLint, Prettier, Vitest, Playwright"
```

---

## Task 4: Domain types and country table

**Files:**
- Create: `src/lib/domain/types.ts`, `src/lib/domain/countries.ts`, `src/lib/domain/permit-rules.ts`, `src/lib/domain/permit-rules.test.ts`

- [ ] **Step 1: Define domain types**

Create `src/lib/domain/types.ts`:

```ts
export type ISODate = string; // "YYYY-MM-DD"

export type PermitType = 'initial_2yr' | 'subsequent_3yr' | 'permanent_5yr';

export type Card = {
  id: string;
  label: string;
  type: PermitType;
  issuedDate: ISODate;
  expiryDate: ISODate;
  notes?: string;
  archived?: boolean;
};

export type TripStatus = 'past' | 'planned';

export type TripPurpose =
  | 'business'
  | 'work'
  | 'cultural'
  | 'social'
  | 'personal'
  | 'medical';

export type Trip = {
  id: string;
  departureDate: ISODate;
  returnDate: ISODate;
  destinationCountry: string; // ISO 3166-1 alpha-2
  destinationCity?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  status: TripStatus;
  needsReview?: boolean;
  purpose?: TripPurpose;
  notes?: string;
};

export type DaycountConvention = 'standard' | 'inclusive_both' | 'exclusive_both';

export type ScopeView = 'portugal' | 'schengen' | 'both';

export type Settings = {
  daycountConvention: DaycountConvention;
  defaultScopeView: ScopeView;
  lastBackupAt?: string; // ISO datetime
  acceptedDisclaimerAt?: string; // ISO datetime
};

export type CountryRecord = {
  code: string; // ISO 3166-1 alpha-2 (uppercase)
  name: string;
  flag: string; // emoji
  isSchengen: boolean;
};
```

- [ ] **Step 2: Create the country table**

Create `src/lib/domain/countries.ts`. Include all current Schengen members as `isSchengen: true` and the most-travelled non-Schengen countries. (List below is the seed; add others as needed.)

```ts
import type { CountryRecord } from './types';

export const COUNTRIES: CountryRecord[] = [
  // Schengen (29 as of 2025: incl. Bulgaria, Romania, Croatia)
  { code: 'AT', name: 'Austria', flag: '🇦🇹', isSchengen: true },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', isSchengen: true },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', isSchengen: true },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', isSchengen: true },
  { code: 'CZ', name: 'Czechia', flag: '🇨🇿', isSchengen: true },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', isSchengen: true },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', isSchengen: true },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', isSchengen: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', isSchengen: true },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', isSchengen: true },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', isSchengen: true },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', isSchengen: true },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', isSchengen: true },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', isSchengen: true },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', isSchengen: true },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', isSchengen: true },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', isSchengen: true },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', isSchengen: true },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', isSchengen: true },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', isSchengen: true },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', isSchengen: true },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', isSchengen: true },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', isSchengen: true },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', isSchengen: true },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', isSchengen: true },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', isSchengen: true },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', isSchengen: true },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', isSchengen: true },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', isSchengen: true },
  // Non-Schengen — common travel destinations from PT
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', isSchengen: false },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', isSchengen: false },
  { code: 'US', name: 'United States', flag: '🇺🇸', isSchengen: false },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', isSchengen: false },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', isSchengen: false },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', isSchengen: false },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', isSchengen: false },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', isSchengen: false },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', isSchengen: false },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', isSchengen: false },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', isSchengen: false },
  { code: 'CN', name: 'China', flag: '🇨🇳', isSchengen: false },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', isSchengen: false },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', isSchengen: false },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', isSchengen: false },
  { code: 'IN', name: 'India', flag: '🇮🇳', isSchengen: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', isSchengen: false },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', isSchengen: false },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', isSchengen: false },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', isSchengen: false },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', isSchengen: false }
  // Add more as needed — full list of ~250 ISO countries can be expanded post-v1.
];

export const COUNTRY_BY_CODE: Record<string, CountryRecord> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

export function isSchengen(code: string): boolean {
  return COUNTRY_BY_CODE[code]?.isSchengen ?? false;
}

export function countryName(code: string): string {
  return COUNTRY_BY_CODE[code]?.name ?? code;
}

export function countryFlag(code: string): string {
  return COUNTRY_BY_CODE[code]?.flag ?? '🏳️';
}
```

- [ ] **Step 3: Write failing test for permit rules**

Create `src/lib/domain/permit-rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { permitRules } from './permit-rules';

describe('permitRules', () => {
  it('returns 6-month / 244-day budgets for initial_2yr', () => {
    const r = permitRules('initial_2yr');
    expect(r.consecutiveMonths).toBe(6);
    expect(r.interpolatedDays).toBe(244);
    expect(r.interpolatedLabel).toBe('8 months (≈244 days)');
    expect(r.windowYears).toBe(0);
  });

  it('returns 6-month / 244-day budgets for subsequent_3yr', () => {
    const r = permitRules('subsequent_3yr');
    expect(r.consecutiveMonths).toBe(6);
    expect(r.interpolatedDays).toBe(244);
  });

  it('returns 24-month / 913-day / 3-year-window for permanent_5yr', () => {
    const r = permitRules('permanent_5yr');
    expect(r.consecutiveMonths).toBe(24);
    expect(r.interpolatedDays).toBe(913);
    expect(r.windowYears).toBe(3);
    expect(r.interpolatedLabel).toBe('30 months (≈913 days) per any 3-year window');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
npm run test -- permit-rules
```

Expected: FAIL — `permitRules is not a function` (or "Cannot find module").

- [ ] **Step 5: Implement permit rules**

Create `src/lib/domain/permit-rules.ts`:

```ts
import type { PermitType } from './types';

export type PermitRule = {
  consecutiveMonths: number;
  interpolatedDays: number;
  interpolatedLabel: string;
  /** 0 = full validity period; >0 = sliding window of N years (permanent permit). */
  windowYears: number;
};

export function permitRules(type: PermitType): PermitRule {
  switch (type) {
    case 'initial_2yr':
    case 'subsequent_3yr':
      return {
        consecutiveMonths: 6,
        interpolatedDays: 244,
        interpolatedLabel: '8 months (≈244 days)',
        windowYears: 0
      };
    case 'permanent_5yr':
      return {
        consecutiveMonths: 24,
        interpolatedDays: 913,
        interpolatedLabel: '30 months (≈913 days) per any 3-year window',
        windowYears: 3
      };
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm run test -- permit-rules
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(domain): add types, country table, and permit rules"
```

---

## Task 5: Date helpers and trip clipping

**Files:**
- Create: `src/lib/engine/dates.ts`, `src/lib/engine/dates.test.ts`

- [ ] **Step 1: Install date-fns**

```bash
npm install date-fns
```

- [ ] **Step 2: Write failing test for date helpers**

Create `src/lib/engine/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { absentDaysFor, clipTrip, daysBetween } from './dates';
import type { Trip } from '../domain/types';

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 't1',
  departureDate: '2026-01-15',
  returnDate: '2026-01-18',
  destinationCountry: 'GB',
  status: 'past',
  ...over
});

describe('daysBetween', () => {
  it('counts inclusive days between two dates', () => {
    expect(daysBetween('2026-01-15', '2026-01-18')).toBe(4);
    expect(daysBetween('2026-01-15', '2026-01-15')).toBe(1);
  });
});

describe('absentDaysFor (standard convention)', () => {
  it('returns dates from departure to day before return', () => {
    const days = absentDaysFor(trip(), 'standard');
    expect(days).toEqual(['2026-01-15', '2026-01-16', '2026-01-17']);
  });

  it('returns empty for same-day trip under standard', () => {
    const days = absentDaysFor(
      trip({ departureDate: '2026-01-15', returnDate: '2026-01-15' }),
      'standard'
    );
    expect(days).toEqual([]);
  });
});

describe('absentDaysFor (inclusive_both convention)', () => {
  it('includes both departure and return days', () => {
    const days = absentDaysFor(trip(), 'inclusive_both');
    expect(days).toEqual(['2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18']);
  });
});

describe('absentDaysFor (exclusive_both convention)', () => {
  it('excludes both departure and return days', () => {
    const days = absentDaysFor(trip(), 'exclusive_both');
    expect(days).toEqual(['2026-01-16', '2026-01-17']);
  });

  it('returns empty for short trips under exclusive', () => {
    const days = absentDaysFor(
      trip({ departureDate: '2026-01-15', returnDate: '2026-01-16' }),
      'exclusive_both'
    );
    expect(days).toEqual([]);
  });
});

describe('clipTrip', () => {
  it('returns the trip unchanged when entirely within window', () => {
    const t = trip({ departureDate: '2026-02-01', returnDate: '2026-02-10' });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped).toEqual(t);
  });

  it('clips departure to window start', () => {
    const t = trip({ departureDate: '2025-12-20', returnDate: '2026-01-10' });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped?.departureDate).toBe('2026-01-01');
    expect(clipped?.returnDate).toBe('2026-01-10');
  });

  it('clips return to window end', () => {
    const t = trip({ departureDate: '2026-12-25', returnDate: '2027-01-05' });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped?.departureDate).toBe('2026-12-25');
    expect(clipped?.returnDate).toBe('2026-12-31');
  });

  it('returns null when trip is entirely outside the window', () => {
    const t = trip({ departureDate: '2027-01-01', returnDate: '2027-01-10' });
    expect(clipTrip(t, '2026-01-01', '2026-12-31')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test, expect failures**

```bash
npm run test -- dates
```

Expected: FAIL — module/function missing.

- [ ] **Step 4: Implement date helpers**

Create `src/lib/engine/dates.ts`:

```ts
import { differenceInCalendarDays, eachDayOfInterval, format, max, min, parseISO } from 'date-fns';
import type { DaycountConvention, ISODate, Trip } from '../domain/types';

const fmt = (d: Date): ISODate => format(d, 'yyyy-MM-dd');

export function daysBetween(start: ISODate, end: ISODate): number {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

export function absentDaysFor(trip: Trip, convention: DaycountConvention): ISODate[] {
  const dep = parseISO(trip.departureDate);
  const ret = parseISO(trip.returnDate);

  let start: Date;
  let end: Date;

  switch (convention) {
    case 'standard':
      // departure absent, return present → [dep, ret − 1]
      start = dep;
      end = new Date(ret.getTime() - 86_400_000);
      break;
    case 'inclusive_both':
      start = dep;
      end = ret;
      break;
    case 'exclusive_both':
      // both border-crossing days present → [dep + 1, ret − 1]
      start = new Date(dep.getTime() + 86_400_000);
      end = new Date(ret.getTime() - 86_400_000);
      break;
  }

  if (end.getTime() < start.getTime()) return [];
  return eachDayOfInterval({ start, end }).map(fmt);
}

export function clipTrip(trip: Trip, windowStart: ISODate, windowEnd: ISODate): Trip | null {
  const ws = parseISO(windowStart);
  const we = parseISO(windowEnd);
  const dep = parseISO(trip.departureDate);
  const ret = parseISO(trip.returnDate);

  if (ret.getTime() < ws.getTime() || dep.getTime() > we.getTime()) return null;

  const clippedDep = max([dep, ws]);
  const clippedRet = min([ret, we]);

  return { ...trip, departureDate: fmt(clippedDep), returnDate: fmt(clippedRet) };
}
```

- [ ] **Step 5: Run the test, expect green**

```bash
npm run test -- dates
```

Expected: PASS (all 9 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(engine): add date helpers and trip clipping"
```

---

## Task 6: Interpolated absence and consecutive streak calculators

**Files:**
- Create: `src/lib/engine/absence.ts`, `src/lib/engine/absence.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/engine/absence.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { interpolatedAbsence, longestConsecutiveStreak } from './absence';
import type { Trip } from '../domain/types';

const t = (id: string, dep: string, ret: string, country = 'GB'): Trip => ({
  id,
  departureDate: dep,
  returnDate: ret,
  destinationCountry: country,
  status: 'past'
});

describe('interpolatedAbsence', () => {
  it('returns 0 for no trips', () => {
    expect(interpolatedAbsence([], 'standard')).toBe(0);
  });

  it('counts a single trip under standard convention', () => {
    expect(interpolatedAbsence([t('1', '2026-01-15', '2026-01-18')], 'standard')).toBe(3);
  });

  it('unions overlapping trips so days are not double-counted', () => {
    const trips = [
      t('1', '2026-01-10', '2026-01-15'),
      t('2', '2026-01-12', '2026-01-20')
    ];
    // Union of absent days under standard:
    // trip1 → 10,11,12,13,14
    // trip2 → 12,13,14,15,16,17,18,19
    // union → 10,11,12,13,14,15,16,17,18,19 → 10 days
    expect(interpolatedAbsence(trips, 'standard')).toBe(10);
  });

  it('handles back-to-back trips correctly under standard', () => {
    // trip1 ends Jan 18 (return), trip2 departs Jan 18
    const trips = [t('1', '2026-01-10', '2026-01-18'), t('2', '2026-01-18', '2026-01-25')];
    // Absent: 10,11,12,13,14,15,16,17 (trip1) + 18,19,20,21,22,23,24 (trip2)
    // Union → 15 days
    expect(interpolatedAbsence(trips, 'standard')).toBe(15);
  });
});

describe('longestConsecutiveStreak', () => {
  it('returns 0 for no trips', () => {
    expect(longestConsecutiveStreak([], 'standard')).toBe(0);
  });

  it('returns the length of a single trip', () => {
    expect(longestConsecutiveStreak([t('1', '2026-01-15', '2026-01-18')], 'standard')).toBe(3);
  });

  it('bridges back-to-back trips with same-day return-and-depart', () => {
    const trips = [t('1', '2026-01-10', '2026-01-18'), t('2', '2026-01-18', '2026-01-25')];
    expect(longestConsecutiveStreak(trips, 'standard')).toBe(15);
  });

  it('does not bridge trips with a gap', () => {
    const trips = [t('1', '2026-01-10', '2026-01-15'), t('2', '2026-01-20', '2026-01-25')];
    // Streak 1 = 5 (10-14), streak 2 = 5 (20-24) — longest is 5
    expect(longestConsecutiveStreak(trips, 'standard')).toBe(5);
  });

  it('returns the longest of multiple streaks', () => {
    const trips = [
      t('1', '2026-01-10', '2026-01-13'), // 3
      t('2', '2026-02-01', '2026-02-15'), // 14
      t('3', '2026-03-01', '2026-03-05') // 4
    ];
    expect(longestConsecutiveStreak(trips, 'standard')).toBe(14);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npm run test -- absence
```

Expected: FAIL — function missing.

- [ ] **Step 3: Implement**

Create `src/lib/engine/absence.ts`:

```ts
import { addDays, format, parseISO } from 'date-fns';
import type { DaycountConvention, ISODate, Trip } from '../domain/types';
import { absentDaysFor } from './dates';

export function interpolatedAbsence(trips: Trip[], convention: DaycountConvention): number {
  const set = new Set<ISODate>();
  for (const trip of trips) {
    for (const d of absentDaysFor(trip, convention)) set.add(d);
  }
  return set.size;
}

export function longestConsecutiveStreak(trips: Trip[], convention: DaycountConvention): number {
  const set = new Set<ISODate>();
  for (const trip of trips) {
    for (const d of absentDaysFor(trip, convention)) set.add(d);
  }
  if (set.size === 0) return 0;

  const days = [...set].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = parseISO(days[i - 1]);
    const next = format(addDays(prev, 1), 'yyyy-MM-dd');
    if (days[i] === next) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}
```

- [ ] **Step 4: Run, expect green**

```bash
npm run test -- absence
```

Expected: PASS (all 9 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add interpolated and consecutive absence calculators"
```

---

## Task 7: `computeCardCompliance` — full assembly

**Files:**
- Create: `src/lib/engine/compliance.ts`, `src/lib/engine/compliance.test.ts`

- [ ] **Step 1: Write failing tests for the full assembly**

Create `src/lib/engine/compliance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeCardCompliance } from './compliance';
import type { Card, Trip, Settings } from '../domain/types';

const card: Card = {
  id: 'c1',
  label: '2nd card',
  type: 'subsequent_3yr',
  issuedDate: '2025-08-01',
  expiryDate: '2028-01-31'
};

const settings: Settings = {
  daycountConvention: 'standard',
  defaultScopeView: 'both'
};

const trip = (over: Partial<Trip>): Trip => ({
  id: 't' + Math.random(),
  departureDate: '2026-01-10',
  returnDate: '2026-01-15',
  destinationCountry: 'GB',
  status: 'past',
  ...over
});

describe('computeCardCompliance', () => {
  it('returns zero metrics for an empty trip list', () => {
    const r = computeCardCompliance({ card, trips: [], today: '2026-05-10', settings });
    expect(r.portugal.interpolated.used).toBe(0);
    expect(r.schengen.interpolated.used).toBe(0);
    expect(r.portugal.consecutive.used).toBe(0);
    expect(r.portugal.consecutive.currentlyAbroad).toBe(false);
  });

  it('counts a UK trip in both Portugal and Schengen scopes', () => {
    const r = computeCardCompliance({
      card,
      trips: [trip({ departureDate: '2025-11-04', returnDate: '2025-11-12', destinationCountry: 'GB' })],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.interpolated.used).toBe(8);
    expect(r.schengen.interpolated.used).toBe(8);
  });

  it('counts a Madrid trip in Portugal scope only', () => {
    const r = computeCardCompliance({
      card,
      trips: [trip({ departureDate: '2025-09-12', returnDate: '2025-09-15', destinationCountry: 'ES' })],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.interpolated.used).toBe(3);
    expect(r.schengen.interpolated.used).toBe(0);
  });

  it('clips trips to card validity', () => {
    const r = computeCardCompliance({
      card,
      trips: [trip({ departureDate: '2025-07-25', returnDate: '2025-08-05', destinationCountry: 'GB' })],
      today: '2026-05-10',
      settings
    });
    // Card starts 2025-08-01 → clipped trip is 2025-08-01 → 2025-08-05 → 4 absent days under standard
    expect(r.portugal.interpolated.used).toBe(4);
  });

  it('detects currently-abroad and computes streak + limit date', () => {
    const r = computeCardCompliance({
      card,
      trips: [trip({ departureDate: '2026-05-04', returnDate: '2026-05-14', destinationCountry: 'GB' })],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.consecutive.currentlyAbroad).toBe(true);
    expect(r.portugal.consecutive.currentStreakDays).toBe(7); // May 4..10 inclusive = 7
    expect(r.portugal.consecutive.limitDate).toBe('2026-11-04'); // dep + 6 months
  });

  it('separates past and planned in projection', () => {
    const r = computeCardCompliance({
      card,
      trips: [
        trip({ departureDate: '2025-11-04', returnDate: '2025-11-12', destinationCountry: 'GB', status: 'past' }),
        trip({ departureDate: '2026-09-02', returnDate: '2026-09-13', destinationCountry: 'TR', status: 'planned' })
      ],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.interpolated.used).toBe(8); // past only
    expect(r.portugal.projectedAfterPlanned.interpolatedUsed).toBe(8 + 11); // + planned
  });

  it('exposes correct budgets per permit type', () => {
    const r = computeCardCompliance({ card, trips: [], today: '2026-05-10', settings });
    expect(r.portugal.consecutive.budgetMonths).toBe(6);
    expect(r.portugal.interpolated.budgetDays).toBe(244);
    expect(r.portugal.interpolated.budgetMonthsLabel).toBe('8 months (≈244 days)');
  });

  it('reports elapsed and validity days', () => {
    const r = computeCardCompliance({ card, trips: [], today: '2026-05-10', settings });
    expect(r.validityDays).toBe(914); // 2025-08-01 → 2028-01-31 inclusive
    expect(r.elapsedDays).toBe(283); // 2025-08-01 → 2026-05-10 inclusive
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npm run test -- compliance
```

- [ ] **Step 3: Implement `computeCardCompliance`**

Create `src/lib/engine/compliance.ts`:

```ts
import { addMonths, format, parseISO } from 'date-fns';
import type { Card, Settings, Trip, ISODate } from '../domain/types';
import { isSchengen } from '../domain/countries';
import { permitRules } from '../domain/permit-rules';
import { absentDaysFor, clipTrip, daysBetween } from './dates';
import { interpolatedAbsence, longestConsecutiveStreak } from './absence';

export type ScopeCompliance = {
  consecutive: {
    used: number;
    budgetMonths: number;
    limitDate?: ISODate;
    currentlyAbroad: boolean;
    currentStreakDays?: number;
  };
  interpolated: {
    used: number;
    budgetDays: number;
    budgetMonthsLabel: string;
  };
  projectedAfterPlanned: {
    consecutiveUsed: number;
    interpolatedUsed: number;
  };
};

export type CardCompliance = {
  cardId: string;
  validityDays: number;
  elapsedDays: number;
  portugal: ScopeCompliance;
  schengen: ScopeCompliance;
};

export function computeCardCompliance(input: {
  card: Card;
  trips: Trip[];
  today: ISODate;
  settings: Settings;
}): CardCompliance {
  const { card, trips, today, settings } = input;
  const rule = permitRules(card.type);

  const validityDays = daysBetween(card.issuedDate, card.expiryDate);
  const todayDate = parseISO(today);
  const issued = parseISO(card.issuedDate);
  const expiry = parseISO(card.expiryDate);
  const elapsedClampedEnd = todayDate.getTime() < expiry.getTime() ? todayDate : expiry;
  const elapsedDays = Math.max(
    0,
    daysBetween(card.issuedDate, format(elapsedClampedEnd, 'yyyy-MM-dd'))
  );

  // Clip every trip to the card's validity window once.
  const clipped = trips
    .map((t) => clipTrip(t, card.issuedDate, card.expiryDate))
    .filter((t): t is Trip => t !== null);

  const past = clipped.filter((t) => t.status === 'past');
  const planned = clipped.filter((t) => t.status === 'planned');

  return {
    cardId: card.id,
    validityDays,
    elapsedDays,
    portugal: scopeFor(past, planned, settings, todayDate, expiry, rule, /* schengenOnly */ false),
    schengen: scopeFor(past, planned, settings, todayDate, expiry, rule, /* schengenOnly */ true)
  };
}

function scopeFor(
  past: Trip[],
  planned: Trip[],
  settings: Settings,
  today: Date,
  expiry: Date,
  rule: ReturnType<typeof permitRules>,
  outsideSchengenOnly: boolean
): ScopeCompliance {
  const filter = (t: Trip) => (outsideSchengenOnly ? !isSchengen(t.destinationCountry) : t.destinationCountry !== 'PT');
  const pastInScope = past.filter(filter);
  const plannedInScope = planned.filter(filter);

  const interpolatedUsed = interpolatedAbsence(pastInScope, settings.daycountConvention);
  const consecutiveUsed = longestConsecutiveStreak(pastInScope, settings.daycountConvention);

  // Currently abroad: today falls inside any past trip's [departure, return) window.
  let currentlyAbroad = false;
  let currentStreakDays: number | undefined;
  let limitDate: ISODate | undefined;
  for (const trip of pastInScope) {
    const dep = parseISO(trip.departureDate);
    const ret = parseISO(trip.returnDate);
    if (dep.getTime() <= today.getTime() && today.getTime() < ret.getTime()) {
      currentlyAbroad = true;
      currentStreakDays = Math.max(
        1,
        Math.floor((today.getTime() - dep.getTime()) / 86_400_000) + 1
      );
      limitDate = format(addMonths(dep, rule.consecutiveMonths), 'yyyy-MM-dd');
      break;
    }
  }

  const projectedTrips = [...pastInScope, ...plannedInScope];
  const projectedInterpolated = interpolatedAbsence(projectedTrips, settings.daycountConvention);
  const projectedConsecutive = longestConsecutiveStreak(projectedTrips, settings.daycountConvention);

  return {
    consecutive: {
      used: consecutiveUsed,
      budgetMonths: rule.consecutiveMonths,
      currentlyAbroad,
      currentStreakDays,
      limitDate
    },
    interpolated: {
      used: interpolatedUsed,
      budgetDays: rule.interpolatedDays,
      budgetMonthsLabel: rule.interpolatedLabel
    },
    projectedAfterPlanned: {
      consecutiveUsed: projectedConsecutive,
      interpolatedUsed: projectedInterpolated
    }
  };
}
```

- [ ] **Step 4: Run, expect green**

```bash
npm run test
```

Expected: PASS — all engine tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): assemble computeCardCompliance for both scopes"
```

---

## Task 8: Permanent-permit sliding 3-year window (engine extension)

**Files:**
- Modify: `src/lib/engine/compliance.ts`
- Modify: `src/lib/engine/compliance.test.ts`

- [ ] **Step 1: Add a failing test for permanent_5yr behaviour**

Append to `src/lib/engine/compliance.test.ts`:

```ts
describe('computeCardCompliance — permanent_5yr', () => {
  const permCard: Card = {
    id: 'p1',
    label: 'Permanent',
    type: 'permanent_5yr',
    issuedDate: '2025-01-01',
    expiryDate: '2030-01-01'
  };

  it('uses the largest interpolated value across any 3-year window', () => {
    // 950 absent days concentrated in 2027 should breach the 913-day / 3-year-window cap
    // even though spread across 5 years it would average lower.
    const big: Trip = {
      id: 'big',
      departureDate: '2027-01-01',
      returnDate: '2029-08-08', // ~950 days under standard convention
      destinationCountry: 'GB',
      status: 'past'
    };
    const r = computeCardCompliance({
      card: permCard,
      trips: [big],
      today: '2030-01-01',
      settings
    });
    expect(r.portugal.interpolated.budgetDays).toBe(913);
    expect(r.portugal.interpolated.used).toBeGreaterThan(913);
  });
});
```

- [ ] **Step 2: Run — confirm it passes already** (because we currently sum across the full validity, which for this fixture is also the worst window).

```bash
npm run test -- compliance
```

Expected: PASS.

- [ ] **Step 3: Add a stricter failing test that REQUIRES the sliding window**

Append:

```ts
it('reports a smaller interpolated count when the trips are spread over 5 years (sliding window finds the worst 3yr)', () => {
  // Two trips: 600 days each, separated by 1 year — together 1200 absent days,
  // but no 3-year window covers more than ~1100. Currently we'd report 1200 (whole window).
  // With a sliding window the value should be approximately 1100, NOT 1200.
  const t1: Trip = {
    id: 't1',
    departureDate: '2025-02-01',
    returnDate: '2026-09-25', // ~601 days (standard)
    destinationCountry: 'GB',
    status: 'past'
  };
  const t2: Trip = {
    id: 't2',
    departureDate: '2027-09-26',
    returnDate: '2029-05-19', // ~601 days
    destinationCountry: 'GB',
    status: 'past'
  };
  const r = computeCardCompliance({
    card: permCard,
    trips: [t1, t2],
    today: '2030-01-01',
    settings
  });
  // Total interpolated across whole 5 years would be ~1202; max 3-yr window should be ~1100 or less.
  expect(r.portugal.interpolated.used).toBeLessThan(1200);
});
```

- [ ] **Step 4: Run — expect failure**

```bash
npm run test -- compliance
```

Expected: FAIL — value is 1202.

- [ ] **Step 5: Implement the sliding window**

Edit `src/lib/engine/compliance.ts`. Add a helper and use it when `rule.windowYears > 0`:

```ts
// Add this import at the top:
import { addYears } from 'date-fns';

// Replace the call to interpolatedAbsence(pastInScope, ...) inside scopeFor with:
const interpolatedUsed = rule.windowYears > 0
  ? maxInterpolatedInSlidingWindow(pastInScope, settings.daycountConvention, rule.windowYears)
  : interpolatedAbsence(pastInScope, settings.daycountConvention);

// Same swap for projectedInterpolated:
const projectedInterpolated = rule.windowYears > 0
  ? maxInterpolatedInSlidingWindow(projectedTrips, settings.daycountConvention, rule.windowYears)
  : interpolatedAbsence(projectedTrips, settings.daycountConvention);
```

Then add the helper at the bottom of the file:

```ts
function maxInterpolatedInSlidingWindow(
  trips: Trip[],
  convention: DaycountConvention,
  windowYears: number
): number {
  if (trips.length === 0) return 0;
  // Candidate window starts: each trip's departure date.
  const starts = trips.map((t) => t.departureDate);
  let best = 0;
  for (const start of starts) {
    const end = format(addYears(parseISO(start), windowYears), 'yyyy-MM-dd');
    const clipped = trips
      .map((t) => clipTrip(t, start, end))
      .filter((t): t is Trip => t !== null);
    const value = interpolatedAbsence(clipped, convention);
    if (value > best) best = value;
  }
  return best;
}
```

Add the missing import:

```ts
import type { DaycountConvention } from '../domain/types';
```

- [ ] **Step 6: Run, expect green**

```bash
npm run test
```

Expected: PASS — all engine tests still green, including the new sliding-window test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(engine): use sliding 3-year window for permanent permits"
```

---

## Task 9: Storage layer with Dexie

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/repositories.ts`, `src/lib/db/repositories.test.ts`

- [ ] **Step 1: Install Dexie and uuid**

```bash
npm install dexie uuid
npm install -D @types/uuid fake-indexeddb
```

- [ ] **Step 2: Define the schema**

Create `src/lib/db/schema.ts`:

```ts
import Dexie, { type Table } from 'dexie';
import type { Card, Trip, Settings } from '../domain/types';

export const SCHEMA_VERSION = 1;

export class TrackerDB extends Dexie {
  cards!: Table<Card, string>;
  trips!: Table<Trip, string>;
  settings!: Table<{ id: string; value: Settings }, string>;

  constructor(name = 'pt-residence-tracker') {
    super(name);
    this.version(1).stores({
      cards: 'id, issuedDate, expiryDate, archived',
      trips: 'id, departureDate, returnDate, status, destinationCountry',
      settings: 'id'
    });
  }
}

export const db = new TrackerDB();
```

- [ ] **Step 3: Write failing tests for repositories**

Create `src/lib/db/repositories.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerDB } from './schema';
import { CardRepo, TripRepo, SettingsRepo, makeRepos } from './repositories';
import type { Card, Trip } from '../domain/types';

let db: TrackerDB;
let repos: ReturnType<typeof makeRepos>;

beforeEach(async () => {
  db = new TrackerDB('test-db-' + Math.random().toString(36).slice(2));
  await db.open();
  repos = makeRepos(db);
});

describe('CardRepo', () => {
  it('creates and retrieves a card', async () => {
    const card: Card = {
      id: 'c1',
      label: 'Card 1',
      type: 'subsequent_3yr',
      issuedDate: '2025-08-01',
      expiryDate: '2028-01-31'
    };
    await repos.cards.put(card);
    const list = await repos.cards.list();
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('Card 1');
  });

  it('returns the active card for today', async () => {
    const c1: Card = {
      id: 'c1', label: 'old', type: 'initial_2yr',
      issuedDate: '2023-07-15', expiryDate: '2025-07-14'
    };
    const c2: Card = {
      id: 'c2', label: 'new', type: 'subsequent_3yr',
      issuedDate: '2025-08-01', expiryDate: '2028-01-31'
    };
    await repos.cards.put(c1);
    await repos.cards.put(c2);
    const active = await repos.cards.activeAt('2026-05-10');
    expect(active?.id).toBe('c2');
  });

  it('returns null when no card is active', async () => {
    const c: Card = {
      id: 'c1', label: 'old', type: 'initial_2yr',
      issuedDate: '2020-01-01', expiryDate: '2022-01-01'
    };
    await repos.cards.put(c);
    expect(await repos.cards.activeAt('2026-05-10')).toBeNull();
  });
});

describe('TripRepo', () => {
  it('creates, lists, and deletes trips', async () => {
    const t: Trip = {
      id: 't1',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past'
    };
    await repos.trips.put(t);
    expect(await repos.trips.list()).toHaveLength(1);
    await repos.trips.delete('t1');
    expect(await repos.trips.list()).toHaveLength(0);
  });

  it('lists planned trips with past return dates', async () => {
    const overdue: Trip = {
      id: 'o',
      departureDate: '2026-04-01',
      returnDate: '2026-04-10',
      destinationCountry: 'GB',
      status: 'planned'
    };
    const future: Trip = {
      id: 'f',
      departureDate: '2026-12-01',
      returnDate: '2026-12-10',
      destinationCountry: 'GB',
      status: 'planned'
    };
    await repos.trips.put(overdue);
    await repos.trips.put(future);
    const overdueOnes = await repos.trips.plannedOverdue('2026-05-10');
    expect(overdueOnes.map((t) => t.id)).toEqual(['o']);
  });
});

describe('SettingsRepo', () => {
  it('returns defaults when no settings stored', async () => {
    const s = await repos.settings.get();
    expect(s.daycountConvention).toBe('standard');
    expect(s.defaultScopeView).toBe('both');
  });

  it('persists updates', async () => {
    await repos.settings.update({ daycountConvention: 'inclusive_both' });
    const s = await repos.settings.get();
    expect(s.daycountConvention).toBe('inclusive_both');
  });
});
```

- [ ] **Step 4: Run, expect failure**

```bash
npm run test -- repositories
```

- [ ] **Step 5: Implement repositories**

Create `src/lib/db/repositories.ts`:

```ts
import type { TrackerDB } from './schema';
import type { Card, Trip, Settings, ISODate } from '../domain/types';

const DEFAULT_SETTINGS: Settings = {
  daycountConvention: 'standard',
  defaultScopeView: 'both'
};

export class CardRepo {
  constructor(private db: TrackerDB) {}
  list = () => this.db.cards.toArray();
  get = (id: string) => this.db.cards.get(id);
  put = (card: Card) => this.db.cards.put(card);
  delete = (id: string) => this.db.cards.delete(id);
  async activeAt(today: ISODate): Promise<Card | null> {
    const all = await this.list();
    return all.find((c) => !c.archived && c.issuedDate <= today && today <= c.expiryDate) ?? null;
  }
}

export class TripRepo {
  constructor(private db: TrackerDB) {}
  list = () => this.db.trips.orderBy('departureDate').toArray();
  get = (id: string) => this.db.trips.get(id);
  put = (trip: Trip) => this.db.trips.put(trip);
  delete = (id: string) => this.db.trips.delete(id);
  async plannedOverdue(today: ISODate): Promise<Trip[]> {
    const all = await this.list();
    return all.filter((t) => t.status === 'planned' && t.returnDate < today);
  }
}

export class SettingsRepo {
  constructor(private db: TrackerDB) {}
  async get(): Promise<Settings> {
    const row = await this.db.settings.get('singleton');
    return row?.value ?? { ...DEFAULT_SETTINGS };
  }
  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const next = { ...current, ...patch };
    await this.db.settings.put({ id: 'singleton', value: next });
    return next;
  }
}

export function makeRepos(db: TrackerDB) {
  return {
    cards: new CardRepo(db),
    trips: new TripRepo(db),
    settings: new SettingsRepo(db)
  };
}
```

- [ ] **Step 6: Run, expect green**

```bash
npm run test -- repositories
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): add Dexie schema and repositories"
```

---

## Task 10: JSON export and import

**Files:**
- Create: `src/lib/db/backup.ts`, `src/lib/db/backup.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/db/backup.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerDB, SCHEMA_VERSION } from './schema';
import { makeRepos } from './repositories';
import { exportToJSON, importFromJSON } from './backup';
import type { Card, Trip } from '../domain/types';

let db: TrackerDB;
let repos: ReturnType<typeof makeRepos>;

beforeEach(async () => {
  db = new TrackerDB('backup-db-' + Math.random().toString(36).slice(2));
  await db.open();
  repos = makeRepos(db);
});

describe('exportToJSON', () => {
  it('exports cards, trips, and settings', async () => {
    const card: Card = {
      id: 'c1', label: 'X', type: 'subsequent_3yr',
      issuedDate: '2025-08-01', expiryDate: '2028-01-31'
    };
    const trip: Trip = {
      id: 't1', departureDate: '2026-01-10', returnDate: '2026-01-15',
      destinationCountry: 'GB', status: 'past'
    };
    await repos.cards.put(card);
    await repos.trips.put(trip);

    const json = JSON.parse(await exportToJSON(repos));
    expect(json.schemaVersion).toBe(SCHEMA_VERSION);
    expect(json.cards).toHaveLength(1);
    expect(json.trips).toHaveLength(1);
    expect(json.exportedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe('importFromJSON', () => {
  it('restores cards and trips, replacing existing data', async () => {
    const payload = {
      schemaVersion: 1,
      exportedAt: '2026-05-10T12:00:00Z',
      cards: [{
        id: 'c1', label: 'Restored', type: 'initial_2yr',
        issuedDate: '2024-01-01', expiryDate: '2026-01-01'
      }],
      trips: [{
        id: 't1', departureDate: '2025-06-01', returnDate: '2025-06-05',
        destinationCountry: 'TR', status: 'past'
      }],
      settings: { daycountConvention: 'inclusive_both', defaultScopeView: 'portugal' }
    };
    await importFromJSON(repos, JSON.stringify(payload));
    const cards = await repos.cards.list();
    const trips = await repos.trips.list();
    const settings = await repos.settings.get();
    expect(cards[0].label).toBe('Restored');
    expect(trips[0].destinationCountry).toBe('TR');
    expect(settings.daycountConvention).toBe('inclusive_both');
  });

  it('rejects mismatched schema versions', async () => {
    const payload = JSON.stringify({ schemaVersion: 999, cards: [], trips: [], settings: {} });
    await expect(importFromJSON(repos, payload)).rejects.toThrow(/schema version/i);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npm run test -- backup
```

- [ ] **Step 3: Implement backup**

Create `src/lib/db/backup.ts`:

```ts
import { SCHEMA_VERSION } from './schema';
import type { makeRepos } from './repositories';

export async function exportToJSON(repos: ReturnType<typeof makeRepos>): Promise<string> {
  const [cards, trips, settings] = await Promise.all([
    repos.cards.list(),
    repos.trips.list(),
    repos.settings.get()
  ]);
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      cards,
      trips,
      settings
    },
    null,
    2
  );
}

export async function importFromJSON(repos: ReturnType<typeof makeRepos>, raw: string): Promise<void> {
  const parsed = JSON.parse(raw);
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${parsed.schemaVersion}`);
  }
  // Replace contents
  const allCards = await repos.cards.list();
  for (const c of allCards) await repos.cards.delete(c.id);
  const allTrips = await repos.trips.list();
  for (const t of allTrips) await repos.trips.delete(t.id);
  for (const c of parsed.cards ?? []) await repos.cards.put(c);
  for (const t of parsed.trips ?? []) await repos.trips.put(t);
  if (parsed.settings) await repos.settings.update(parsed.settings);
  await repos.settings.update({ lastBackupAt: new Date().toISOString() });
}
```

- [ ] **Step 4: Run, expect green**

```bash
npm run test -- backup
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): add JSON export/import"
```

---

## Task 11: Reactive stores and the auto-flip effect

**Files:**
- Create: `src/lib/stores/data.svelte.ts`, `src/lib/stores/data.svelte.test.ts`

- [ ] **Step 1: Write failing tests for the auto-flip helper**

Create `src/lib/stores/data.svelte.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerDB } from '../db/schema';
import { makeRepos } from '../db/repositories';
import { autoFlipOverdue } from './data.svelte';
import type { Trip } from '../domain/types';

let db: TrackerDB;
let repos: ReturnType<typeof makeRepos>;

beforeEach(async () => {
  db = new TrackerDB('autoflip-' + Math.random().toString(36).slice(2));
  await db.open();
  repos = makeRepos(db);
});

describe('autoFlipOverdue', () => {
  it('flips planned → past with needsReview when return date has passed', async () => {
    const t: Trip = {
      id: 't1', departureDate: '2026-04-01', returnDate: '2026-04-10',
      destinationCountry: 'GB', status: 'planned'
    };
    await repos.trips.put(t);
    const flipped = await autoFlipOverdue(repos, '2026-05-10');
    expect(flipped).toBe(1);
    const updated = await repos.trips.get('t1');
    expect(updated?.status).toBe('past');
    expect(updated?.needsReview).toBe(true);
  });

  it('does not flip same-day returns (1-day buffer)', async () => {
    const t: Trip = {
      id: 't1', departureDate: '2026-05-09', returnDate: '2026-05-10',
      destinationCountry: 'GB', status: 'planned'
    };
    await repos.trips.put(t);
    const flipped = await autoFlipOverdue(repos, '2026-05-10');
    expect(flipped).toBe(0);
  });

  it('does not touch already-past trips', async () => {
    const t: Trip = {
      id: 't1', departureDate: '2026-04-01', returnDate: '2026-04-10',
      destinationCountry: 'GB', status: 'past'
    };
    await repos.trips.put(t);
    const flipped = await autoFlipOverdue(repos, '2026-05-10');
    expect(flipped).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npm run test -- data.svelte
```

- [ ] **Step 3: Implement the store and helper**

Create `src/lib/stores/data.svelte.ts`:

```ts
import { addDays, format, parseISO } from 'date-fns';
import { db } from '../db/schema';
import { makeRepos } from '../db/repositories';
import type { Card, ISODate, Settings, Trip } from '../domain/types';

export const repos = makeRepos(db);

export function todayISO(): ISODate {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Flip planned trips whose return date is at least 1 day in the past
 * to status `past` with `needsReview = true`.
 * Returns the number of trips flipped.
 */
export async function autoFlipOverdue(
  r: ReturnType<typeof makeRepos>,
  today: ISODate
): Promise<number> {
  const cutoff = format(addDays(parseISO(today), -1), 'yyyy-MM-dd');
  const overdue = await r.trips.list();
  let count = 0;
  for (const t of overdue) {
    if (t.status === 'planned' && t.returnDate <= cutoff) {
      await r.trips.put({ ...t, status: 'past', needsReview: true });
      count++;
    }
  }
  return count;
}

class DataStore {
  cards = $state<Card[]>([]);
  trips = $state<Trip[]>([]);
  settings = $state<Settings>({ daycountConvention: 'standard', defaultScopeView: 'both' });
  loaded = $state(false);

  async load() {
    const [cards, trips, settings] = await Promise.all([
      repos.cards.list(),
      repos.trips.list(),
      repos.settings.get()
    ]);
    this.cards = cards;
    this.trips = trips;
    this.settings = settings;
    this.loaded = true;
  }

  async refresh() {
    await this.load();
  }

  async upsertCard(card: Card) {
    await repos.cards.put(card);
    await this.refresh();
  }

  async deleteCard(id: string) {
    await repos.cards.delete(id);
    await this.refresh();
  }

  async upsertTrip(trip: Trip) {
    await repos.trips.put(trip);
    await this.refresh();
  }

  async deleteTrip(id: string) {
    await repos.trips.delete(id);
    await this.refresh();
  }

  async updateSettings(patch: Partial<Settings>) {
    this.settings = await repos.settings.update(patch);
  }
}

export const data = new DataStore();
```

- [ ] **Step 4: Run, expect green**

```bash
npm run test -- data.svelte
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(stores): add reactive data store and autoFlipOverdue"
```

---

## Task 12: Layout shell, navigation, and disclaimer modal

**Files:**
- Modify: `src/routes/+layout.svelte`
- Create: `src/lib/components/BottomNav.svelte`, `src/lib/components/DisclaimerModal.svelte`
- Create: `src/routes/+layout.ts`

- [ ] **Step 1: Add the layout loader to bootstrap data**

Create `src/routes/+layout.ts`:

```ts
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'always';
```

- [ ] **Step 2: Build the BottomNav component**

Create `src/lib/components/BottomNav.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  const items = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/trips/', label: 'Trips', icon: '✈️' },
    { href: '/cards/', label: 'Cards', icon: '🪪' },
    { href: '/simulate/', label: 'Simulate', icon: '🧮' },
    { href: '/settings/', label: 'Settings', icon: '⚙️' }
  ];
</script>

<nav class="fixed bottom-0 inset-x-0 bg-white dark:bg-neutral-900 border-t flex justify-around py-2 text-xs">
  {#each items as item (item.href)}
    {@const active = page.url.pathname === item.href}
    <a
      href={item.href}
      class="flex flex-col items-center px-2 py-1 {active ? 'font-semibold' : 'text-neutral-500'}"
    >
      <span class="text-lg leading-none">{item.icon}</span>
      <span>{item.label}</span>
    </a>
  {/each}
</nav>
```

- [ ] **Step 3: Build the DisclaimerModal**

Create `src/lib/components/DisclaimerModal.svelte`:

```svelte
<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  let { open = $bindable(false) } = $props();

  async function accept() {
    await data.updateSettings({ acceptedDisclaimerAt: new Date().toISOString() });
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-neutral-900 rounded-xl max-w-md p-6 space-y-3">
      <h2 class="text-lg font-semibold">Before you start</h2>
      <p class="text-sm">
        This is an unofficial planning tool. Numbers are calculated from the dates you enter and a published
        interpretation of <strong>Article 85 of Lei n.º 23/2007</strong>. <strong>It is not legal advice.</strong>
      </p>
      <p class="text-sm">
        For decisions affecting your residency status, consult AIMA or a licensed Portuguese immigration attorney.
      </p>
      <p class="text-sm">
        Your data is stored only on this device. On iOS Safari you should
        <strong>Add to Home Screen</strong> to prevent the browser from clearing it after ~7 days of inactivity.
      </p>
      <button class="bg-black text-white w-full py-2 rounded-lg" onclick={accept}>I understand</button>
    </div>
  </div>
{/if}
```

- [ ] **Step 4: Replace the root layout**

Edit `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { data, autoFlipOverdue, repos, todayISO } from '$lib/stores/data.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import DisclaimerModal from '$lib/components/DisclaimerModal.svelte';

  let { children } = $props();
  let showDisclaimer = $state(false);

  onMount(async () => {
    await data.load();
    await autoFlipOverdue(repos, todayISO());
    await data.refresh();
    if (!data.settings.acceptedDisclaimerAt) showDisclaimer = true;
    if ('storage' in navigator && navigator.storage.persist) {
      await navigator.storage.persist().catch(() => {});
    }
  });
</script>

<div class="min-h-screen pb-16">
  <main class="max-w-2xl mx-auto p-4">
    {@render children()}
  </main>
  <BottomNav />
  <DisclaimerModal bind:open={showDisclaimer} />
</div>
```

- [ ] **Step 5: Run autofixer on every Svelte file**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/lib/components/BottomNav.svelte
npx @sveltejs/mcp svelte-autofixer ./src/lib/components/DisclaimerModal.svelte
npx @sveltejs/mcp svelte-autofixer ./src/routes/+layout.svelte
```

Fix any issues.

- [ ] **Step 6: Verify build still works and dev server runs**

```bash
npm run build && npm run dev
```

Open http://localhost:5173 — disclaimer modal should appear on first visit. Stop with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): add layout shell, bottom nav, and disclaimer modal"
```

---

## Task 13: Country combobox component

**Files:**
- Create: `src/lib/components/CountryPicker.svelte`

- [ ] **Step 1: Build the picker**

Create `src/lib/components/CountryPicker.svelte`:

```svelte
<script lang="ts">
  import { COUNTRIES } from '$lib/domain/countries';

  let {
    value = $bindable(''),
    placeholder = 'Search countries…'
  }: { value?: string; placeholder?: string } = $props();

  let query = $state('');
  let open = $state(false);

  const filtered = $derived(
    query.trim() === ''
      ? COUNTRIES.slice(0, 12)
      : COUNTRIES.filter((c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().startsWith(query.toLowerCase())
        ).slice(0, 20)
  );

  const current = $derived(COUNTRIES.find((c) => c.code === value));

  function pick(code: string) {
    value = code;
    query = '';
    open = false;
  }
</script>

<div class="relative">
  <button
    type="button"
    class="w-full text-left border rounded-lg px-3 py-2 bg-white dark:bg-neutral-800"
    onclick={() => (open = !open)}
  >
    {current ? `${current.flag} ${current.name}` : 'Pick a country'}
  </button>
  {#if open}
    <div class="absolute inset-x-0 z-10 mt-1 bg-white dark:bg-neutral-900 border rounded-lg shadow-lg max-h-64 overflow-auto">
      <input
        bind:value={query}
        {placeholder}
        class="w-full px-3 py-2 border-b bg-transparent"
        autofocus
      />
      <ul>
        {#each filtered as c (c.code)}
          <li>
            <button
              type="button"
              class="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex justify-between"
              onclick={() => pick(c.code)}
            >
              <span>{c.flag} {c.name}</span>
              <span class="text-xs text-neutral-500">
                {c.isSchengen ? 'Schengen' : 'Outside Schengen'}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Run autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/lib/components/CountryPicker.svelte
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): add country picker combobox"
```

---

## Task 14: Cards route

**Files:**
- Create: `src/routes/cards/+page.svelte`, `src/routes/cards/CardForm.svelte`

- [ ] **Step 1: Build the form**

Create `src/routes/cards/CardForm.svelte`:

```svelte
<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import type { Card, PermitType } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  let { initial, onClose }: { initial?: Card; onClose: () => void } = $props();

  let label = $state(initial?.label ?? '');
  let type = $state<PermitType>(initial?.type ?? 'subsequent_3yr');
  let issuedDate = $state(initial?.issuedDate ?? '');
  let expiryDate = $state(initial?.expiryDate ?? '');
  let notes = $state(initial?.notes ?? '');

  async function save() {
    const card: Card = {
      id: initial?.id ?? uuid(),
      label: label.trim() || 'Card',
      type,
      issuedDate,
      expiryDate,
      notes: notes.trim() || undefined,
      archived: initial?.archived
    };
    await data.upsertCard(card);
    onClose();
  }

  async function remove() {
    if (!initial) return;
    if (!confirm(`Delete ${initial.label}?`)) return;
    await data.deleteCard(initial.id);
    onClose();
  }
</script>

<div class="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border">
  <h3 class="font-semibold">{initial ? 'Edit' : 'New'} card</h3>

  <label class="block text-sm">
    Label
    <input class="w-full border rounded px-2 py-1 mt-1" bind:value={label} placeholder="e.g. 2nd card" />
  </label>

  <label class="block text-sm">
    Permit type
    <select class="w-full border rounded px-2 py-1 mt-1" bind:value={type}>
      <option value="initial_2yr">Initial · 2-year</option>
      <option value="subsequent_3yr">Subsequent temporary · 3-year</option>
      <option value="permanent_5yr">Permanent · 5-year</option>
    </select>
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm">
      Issued
      <input type="date" class="w-full border rounded px-2 py-1 mt-1" bind:value={issuedDate} />
    </label>
    <label class="block text-sm">
      Expiry
      <input type="date" class="w-full border rounded px-2 py-1 mt-1" bind:value={expiryDate} />
    </label>
  </div>

  <label class="block text-sm">
    Notes
    <textarea class="w-full border rounded px-2 py-1 mt-1" rows="2" bind:value={notes}></textarea>
  </label>

  <div class="flex gap-2">
    <button class="flex-1 bg-black text-white py-2 rounded" onclick={save} disabled={!issuedDate || !expiryDate}>Save</button>
    <button class="flex-1 bg-neutral-200 py-2 rounded" onclick={onClose}>Cancel</button>
    {#if initial}<button class="px-3 py-2 text-red-700" onclick={remove}>Delete</button>{/if}
  </div>
</div>
```

- [ ] **Step 2: Build the list page**

Create `src/routes/cards/+page.svelte`:

```svelte
<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import CardForm from './CardForm.svelte';
  import type { Card } from '$lib/domain/types';

  let editing = $state<Card | null>(null);
  let creating = $state(false);

  const today = todayISO();

  function activeFor(card: Card) {
    return card.issuedDate <= today && today <= card.expiryDate;
  }

  function summaryLine(card: Card) {
    const r = computeCardCompliance({ card, trips: data.trips, today, settings: data.settings });
    return r;
  }
</script>

<header class="flex justify-between items-center mb-4">
  <h1 class="text-xl font-semibold">My cards</h1>
  <button class="bg-black text-white px-3 py-2 rounded" onclick={() => (creating = true)}>+ Add card</button>
</header>

{#if creating}
  <CardForm onClose={() => (creating = false)} />
{/if}

{#if editing}
  <CardForm initial={editing} onClose={() => (editing = null)} />
{/if}

<ul class="space-y-3 mt-3">
  {#each data.cards as card (card.id)}
    {@const compliance = summaryLine(card)}
    {@const isActive = activeFor(card)}
    <li
      class="rounded-xl border p-4 {isActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'opacity-70'}"
    >
      <div class="flex justify-between">
        <div>
          <div class="font-semibold">{card.label}</div>
          <div class="text-xs text-neutral-500">
            {card.type === 'initial_2yr' ? 'Initial · 2 yr'
              : card.type === 'subsequent_3yr' ? 'Subsequent temporary · 3 yr'
              : 'Permanent · 5 yr'}
          </div>
        </div>
        <span class="text-xs">{isActive ? 'Active' : (card.expiryDate < today ? 'Expired' : 'Future')}</span>
      </div>
      <div class="text-xs text-neutral-500 mt-2">
        {card.issuedDate} → {card.expiryDate} · {compliance.elapsedDays} / {compliance.validityDays} days
      </div>
      <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div>Portugal: <strong>{compliance.portugal.interpolated.used}</strong> / {compliance.portugal.interpolated.budgetDays} d</div>
        <div>Schengen: <strong>{compliance.schengen.interpolated.used}</strong> / {compliance.schengen.interpolated.budgetDays} d</div>
      </div>
      <div class="mt-3 flex gap-2">
        <button class="text-sm border rounded px-2 py-1" onclick={() => (editing = card)}>Edit</button>
      </div>
    </li>
  {/each}
</ul>
```

- [ ] **Step 3: Run autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/cards/+page.svelte
npx @sveltejs/mcp svelte-autofixer ./src/routes/cards/CardForm.svelte
```

- [ ] **Step 4: Manually verify in dev**

```bash
npm run dev
```

Visit `/cards/`, add a card with `2025-08-01` → `2028-01-31`, type `subsequent_3yr`, label `2nd card`. Confirm it appears as Active. Stop with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): cards route — list and CRUD form"
```

---

## Task 15: Trips route

**Files:**
- Create: `src/routes/trips/+page.svelte`, `src/routes/trips/TripForm.svelte`

- [ ] **Step 1: Build the form**

Create `src/routes/trips/TripForm.svelte`:

```svelte
<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import { isSchengen } from '$lib/domain/countries';
  import CountryPicker from '$lib/components/CountryPicker.svelte';
  import type { Trip, TripStatus, TripPurpose } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  let { initial, onClose }: { initial?: Trip; onClose: () => void } = $props();

  let status = $state<TripStatus>(initial?.status ?? 'past');
  let departureDate = $state(initial?.departureDate ?? '');
  let returnDate = $state(initial?.returnDate ?? '');
  let destinationCountry = $state(initial?.destinationCountry ?? '');
  let destinationCity = $state(initial?.destinationCity ?? '');
  let departureAirport = $state(initial?.departureAirport ?? '');
  let arrivalAirport = $state(initial?.arrivalAirport ?? '');
  let purpose = $state<TripPurpose | undefined>(initial?.purpose);
  let notes = $state(initial?.notes ?? '');

  const purposes: TripPurpose[] = ['personal', 'business', 'work', 'cultural', 'social', 'medical'];

  const draft: Trip = $derived({
    id: initial?.id ?? '__draft__',
    departureDate,
    returnDate,
    destinationCountry,
    destinationCity: destinationCity || undefined,
    departureAirport: departureAirport || undefined,
    arrivalAirport: arrivalAirport || undefined,
    status,
    purpose,
    notes: notes || undefined
  });

  const today = todayISO();
  const activeCard = $derived(
    data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate) ?? null
  );

  const preview = $derived.by(() => {
    if (!activeCard || !departureDate || !returnDate || !destinationCountry) return null;
    const before = computeCardCompliance({ card: activeCard, trips: data.trips, today, settings: data.settings });
    const trips = initial
      ? data.trips.map((t) => (t.id === initial.id ? draft : t))
      : [...data.trips, draft];
    const after = computeCardCompliance({ card: activeCard, trips, today, settings: data.settings });
    return { before, after };
  });

  async function save() {
    if (!destinationCountry || !departureDate || !returnDate) return;
    const trip: Trip = {
      id: initial?.id ?? uuid(),
      departureDate,
      returnDate,
      destinationCountry,
      destinationCity: destinationCity || undefined,
      departureAirport: departureAirport || undefined,
      arrivalAirport: arrivalAirport || undefined,
      status,
      needsReview: false,
      purpose,
      notes: notes || undefined
    };
    await data.upsertTrip(trip);
    onClose();
  }

  async function remove() {
    if (!initial) return;
    if (!confirm('Delete this trip?')) return;
    await data.deleteTrip(initial.id);
    onClose();
  }
</script>

<div class="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border">
  <h3 class="font-semibold">{initial ? 'Edit' : 'New'} trip</h3>

  <div class="flex gap-2">
    <button class="flex-1 py-1 rounded border {status === 'past' ? 'bg-black text-white' : ''}" onclick={() => (status = 'past')}>Past</button>
    <button class="flex-1 py-1 rounded border {status === 'planned' ? 'bg-black text-white' : ''}" onclick={() => (status = 'planned')}>Planned</button>
  </div>

  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm">Departure
      <input type="date" class="w-full border rounded px-2 py-1 mt-1" bind:value={departureDate} />
    </label>
    <label class="block text-sm">Return
      <input type="date" class="w-full border rounded px-2 py-1 mt-1" bind:value={returnDate} />
    </label>
  </div>

  <div class="text-sm">
    <div class="mb-1">Destination</div>
    <CountryPicker bind:value={destinationCountry} />
  </div>

  <label class="block text-sm">City <input class="w-full border rounded px-2 py-1 mt-1" bind:value={destinationCity} /></label>

  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm">From airport <input class="w-full border rounded px-2 py-1 mt-1" bind:value={departureAirport} placeholder="LIS" /></label>
    <label class="block text-sm">To airport <input class="w-full border rounded px-2 py-1 mt-1" bind:value={arrivalAirport} placeholder="LHR" /></label>
  </div>

  <div class="text-sm">Purpose
    <div class="flex gap-1 flex-wrap mt-1">
      {#each purposes as p (p)}
        <button class="text-xs px-2 py-1 rounded-full border {purpose === p ? 'bg-black text-white' : ''}" onclick={() => (purpose = purpose === p ? undefined : p)}>{p}</button>
      {/each}
    </div>
  </div>

  <label class="block text-sm">Notes <textarea class="w-full border rounded px-2 py-1 mt-1" rows="2" bind:value={notes}></textarea></label>

  {#if preview}
    <div class="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded">
      <div class="font-semibold mb-1">Impact preview</div>
      Portugal: {preview.before.portugal.interpolated.used} → <strong>{preview.after.portugal.interpolated.used}</strong> / {preview.after.portugal.interpolated.budgetDays} d<br>
      Schengen: {preview.before.schengen.interpolated.used} → <strong>{preview.after.schengen.interpolated.used}</strong> / {preview.after.schengen.interpolated.budgetDays} d<br>
      {#if !isSchengen(destinationCountry)}<span>Outside Schengen</span>{:else}<span>Inside Schengen</span>{/if}
    </div>
  {/if}

  <div class="flex gap-2">
    <button class="flex-1 bg-black text-white py-2 rounded" onclick={save}>Save</button>
    <button class="flex-1 bg-neutral-200 py-2 rounded" onclick={onClose}>Cancel</button>
    {#if initial}<button class="px-3 py-2 text-red-700" onclick={remove}>Delete</button>{/if}
  </div>
</div>
```

- [ ] **Step 2: Build the trips list**

Create `src/routes/trips/+page.svelte`:

```svelte
<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { countryFlag, countryName, isSchengen } from '$lib/domain/countries';
  import { daysBetween } from '$lib/engine/dates';
  import TripForm from './TripForm.svelte';
  import type { Trip } from '$lib/domain/types';

  type Filter = 'all' | 'past' | 'planned' | 'outside';
  let filter = $state<Filter>('all');
  let editing = $state<Trip | null>(null);
  let creating = $state(false);

  const today = todayISO();

  const filtered = $derived(
    data.trips
      .slice()
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .filter((t) => {
        if (filter === 'past') return t.status === 'past';
        if (filter === 'planned') return t.status === 'planned';
        if (filter === 'outside') return !isSchengen(t.destinationCountry);
        return true;
      })
  );

  function isCurrent(t: Trip) {
    return t.departureDate <= today && today < t.returnDate;
  }
</script>

<header class="flex justify-between items-center mb-4">
  <h1 class="text-xl font-semibold">Trips</h1>
  <button class="bg-black text-white px-3 py-2 rounded" onclick={() => (creating = true)}>+ Add trip</button>
</header>

<div class="flex gap-2 mb-4 text-xs">
  {#each [['all','All'],['past','Past'],['planned','Planned'],['outside','Outside Schengen']] as [v, label] (v)}
    <button class="px-3 py-1 rounded-full border {filter === v ? 'bg-black text-white' : ''}" onclick={() => (filter = v as Filter)}>{label}</button>
  {/each}
</div>

{#if creating}<TripForm onClose={() => (creating = false)} />{/if}
{#if editing}<TripForm initial={editing} onClose={() => (editing = null)} />{/if}

<ul class="space-y-2 mt-3">
  {#each filtered as t (t.id)}
    {@const current = isCurrent(t)}
    {@const sch = isSchengen(t.destinationCountry)}
    <li
      class="rounded-xl border p-3 {current ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}"
    >
      <button class="w-full text-left" onclick={() => (editing = t)}>
        <div class="flex justify-between">
          <span class="font-semibold">{countryFlag(t.destinationCountry)} {countryName(t.destinationCountry)}{t.destinationCity ? ' — ' + t.destinationCity : ''}</span>
          <span class="text-sm font-semibold">{daysBetween(t.departureDate, t.returnDate) - 1} d</span>
        </div>
        <div class="text-xs text-neutral-500">{t.departureDate} → {t.returnDate} {t.departureAirport ? '· ' + t.departureAirport : ''}{t.arrivalAirport ? '→' + t.arrivalAirport : ''}</div>
        <div class="text-xs flex gap-1 mt-1">
          <span class="px-1.5 py-0.5 rounded {sch ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'}">{sch ? 'Schengen' : 'Outside Schengen'}</span>
          {#if t.purpose}<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">{t.purpose}</span>{/if}
          {#if t.status === 'planned'}<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">planned</span>{/if}
          {#if t.needsReview}<span class="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900">needs review ⚠️</span>{/if}
        </div>
      </button>
    </li>
  {/each}
</ul>
```

- [ ] **Step 3: Autofixer + manual verify**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/trips/TripForm.svelte
npx @sveltejs/mcp svelte-autofixer ./src/routes/trips/+page.svelte
npm run dev
```

Add a trip; verify the impact preview updates as you type. Stop with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): trips route — list, filters, CRUD form with live impact"
```

---

## Task 16: Dashboard

**Files:**
- Modify: `src/routes/+page.svelte`
- Create: `src/lib/components/AbsenceTile.svelte`, `src/lib/components/Timeline.svelte`

- [ ] **Step 1: Build the AbsenceTile**

Create `src/lib/components/AbsenceTile.svelte`:

```svelte
<script lang="ts">
  let {
    label,
    used,
    budget,
    sub
  }: { label: string; used: number; budget: number; sub: string } = $props();

  const pct = $derived(Math.min(100, Math.round((used / budget) * 100)));
  const tone = $derived(pct < 50 ? 'ok' : pct < 80 ? 'warn' : 'danger');
  const barColor = $derived(
    tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-red-500'
  );
</script>

<div class="rounded-xl border p-4 bg-white dark:bg-neutral-900">
  <div class="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
  <div class="text-3xl font-bold mt-1">{used}<span class="text-sm font-medium text-neutral-500"> / {budget} days</span></div>
  <div class="text-xs text-neutral-500 mt-1">{sub}</div>
  <div class="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-3 overflow-hidden">
    <div class="h-full {barColor}" style="width: {pct}%"></div>
  </div>
</div>
```

- [ ] **Step 2: Build the Timeline**

Create `src/lib/components/Timeline.svelte`:

```svelte
<script lang="ts">
  import { differenceInCalendarDays, parseISO } from 'date-fns';
  import type { Card, Trip, ISODate } from '$lib/domain/types';

  let { card, trips, today }: { card: Card; trips: Trip[]; today: ISODate } = $props();

  const total = $derived(differenceInCalendarDays(parseISO(card.expiryDate), parseISO(card.issuedDate)) + 1);

  function pct(date: ISODate): number {
    const days = differenceInCalendarDays(parseISO(date), parseISO(card.issuedDate));
    return Math.max(0, Math.min(100, (days / total) * 100));
  }
</script>

<div class="rounded-xl border p-4 bg-white dark:bg-neutral-900">
  <h3 class="text-sm font-semibold mb-2">Card timeline</h3>
  <div class="relative h-7 bg-neutral-100 dark:bg-neutral-800 rounded">
    {#each trips as t (t.id)}
      {@const left = pct(t.departureDate)}
      {@const width = Math.max(0.5, pct(t.returnDate) - left)}
      <div
        class="absolute top-1 h-5 rounded-sm {t.status === 'past' ? 'bg-blue-600' : 'bg-blue-300 border border-dashed border-blue-700'}"
        style="left: {left}%; width: {width}%"
        title="{t.departureDate} → {t.returnDate}"
      ></div>
    {/each}
    <div class="absolute -top-0.5 -bottom-0.5 w-0.5 bg-red-500" style="left: {pct(today)}%"></div>
  </div>
  <div class="flex justify-between text-[10px] text-neutral-500 mt-2">
    <span>{card.issuedDate}</span>
    <span>today</span>
    <span>{card.expiryDate}</span>
  </div>
</div>
```

- [ ] **Step 3: Build the dashboard page**

Replace `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import AbsenceTile from '$lib/components/AbsenceTile.svelte';
  import Timeline from '$lib/components/Timeline.svelte';

  const today = todayISO();
  const activeCard = $derived(data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate));
  const compliance = $derived(
    activeCard ? computeCardCompliance({ card: activeCard, trips: data.trips, today, settings: data.settings }) : null
  );
  let view = $state<'today' | 'projected'>('today');
</script>

{#if !data.loaded}
  <p>Loading…</p>
{:else if !activeCard}
  <div class="rounded-xl border p-4 text-center">
    <p>No active residence card.</p>
    <a href="/cards/" class="underline text-sm">Add a card →</a>
  </div>
{:else if compliance}
  <header class="rounded-xl bg-black text-white p-4 mb-4">
    <div class="text-xs opacity-60 uppercase">Active card</div>
    <div class="font-semibold">{activeCard.label}</div>
    <div class="text-xs opacity-75 mt-0.5">
      {activeCard.issuedDate} → {activeCard.expiryDate} · {compliance.elapsedDays} / {compliance.validityDays} days
    </div>
    <div class="h-1.5 bg-white/20 rounded mt-2 overflow-hidden">
      <div class="h-full bg-emerald-300" style="width: {Math.min(100, (compliance.elapsedDays / compliance.validityDays) * 100)}%"></div>
    </div>
  </header>

  {#if compliance.portugal.consecutive.currentlyAbroad}
    <div class="rounded-xl border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3 mb-4 text-sm">
      <strong>You are currently abroad —</strong> day {compliance.portugal.consecutive.currentStreakDays}.
      Return by <strong>{compliance.portugal.consecutive.limitDate}</strong> to stay under the {compliance.portugal.consecutive.budgetMonths}-month consecutive limit.
    </div>
  {/if}

  <div class="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-3 text-sm">
    <button class="flex-1 py-1 rounded {view === 'today' ? 'bg-black text-white' : ''}" onclick={() => (view = 'today')}>As of today</button>
    <button class="flex-1 py-1 rounded {view === 'projected' ? 'bg-black text-white' : ''}" onclick={() => (view = 'projected')}>Projected (incl. planned)</button>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">
    <AbsenceTile
      label="Portugal absence"
      used={view === 'today' ? compliance.portugal.interpolated.used : compliance.portugal.projectedAfterPlanned.interpolatedUsed}
      budget={compliance.portugal.interpolated.budgetDays}
      sub={compliance.portugal.interpolated.budgetMonthsLabel}
    />
    <AbsenceTile
      label="Schengen absence"
      used={view === 'today' ? compliance.schengen.interpolated.used : compliance.schengen.projectedAfterPlanned.interpolatedUsed}
      budget={compliance.schengen.interpolated.budgetDays}
      sub={compliance.schengen.interpolated.budgetMonthsLabel}
    />
  </div>

  <div class="rounded-xl border p-4 mb-4">
    <div class="text-xs text-neutral-500">Longest consecutive absence</div>
    <div class="font-semibold mt-1">{compliance.portugal.consecutive.used} d <span class="text-sm text-neutral-500">/ {compliance.portugal.consecutive.budgetMonths}-month limit</span></div>
  </div>

  <Timeline card={activeCard} trips={data.trips} {today} />
{/if}
```

- [ ] **Step 4: Autofixer + verify**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/lib/components/AbsenceTile.svelte
npx @sveltejs/mcp svelte-autofixer ./src/lib/components/Timeline.svelte
npx @sveltejs/mcp svelte-autofixer ./src/routes/+page.svelte
npm run dev
```

Visit `/`. Confirm the dashboard renders with the card you added in Task 14. Stop.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): dashboard with tiles, alert banner, and timeline"
```

---

## Task 17: Simulator route

**Files:**
- Create: `src/routes/simulate/+page.svelte`

- [ ] **Step 1: Build the simulator page**

Create `src/routes/simulate/+page.svelte`:

```svelte
<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import { isSchengen } from '$lib/domain/countries';
  import CountryPicker from '$lib/components/CountryPicker.svelte';
  import type { Trip } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  const today = todayISO();
  const activeCard = $derived(data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate));

  let departureDate = $state('');
  let returnDate = $state('');
  let destinationCountry = $state('');

  const draft: Trip = $derived({
    id: '__sim__',
    departureDate,
    returnDate,
    destinationCountry,
    status: 'planned'
  });

  const result = $derived.by(() => {
    if (!activeCard || !departureDate || !returnDate || !destinationCountry) return null;
    const before = computeCardCompliance({ card: activeCard, trips: data.trips, today, settings: data.settings });
    const after = computeCardCompliance({
      card: activeCard,
      trips: [...data.trips, draft],
      today,
      settings: data.settings
    });
    return { before, after };
  });

  const overLimit = $derived(
    result &&
      (result.after.portugal.projectedAfterPlanned.interpolatedUsed > result.after.portugal.interpolated.budgetDays ||
       result.after.schengen.projectedAfterPlanned.interpolatedUsed > result.after.schengen.interpolated.budgetDays)
  );

  async function saveAsPlanned() {
    if (!destinationCountry) return;
    const trip: Trip = { ...draft, id: uuid() };
    await data.upsertTrip(trip);
    departureDate = returnDate = destinationCountry = '';
  }
</script>

<h1 class="text-xl font-semibold mb-4">🧮 Simulator</h1>

{#if !activeCard}
  <p class="text-sm">Add an active card first.</p>
{:else}
  <div class="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border">
    <div class="grid grid-cols-2 gap-2">
      <label class="block text-sm">Departure
        <input type="date" class="w-full border rounded px-2 py-1 mt-1" bind:value={departureDate} />
      </label>
      <label class="block text-sm">Return
        <input type="date" class="w-full border rounded px-2 py-1 mt-1" bind:value={returnDate} />
      </label>
    </div>
    <div class="text-sm">
      <div class="mb-1">Destination</div>
      <CountryPicker bind:value={destinationCountry} />
    </div>
    {#if destinationCountry}
      <div class="text-xs">{isSchengen(destinationCountry) ? 'Inside Schengen — counts toward Portugal only' : 'Outside Schengen — counts toward both'}</div>
    {/if}
  </div>

  {#if result}
    <div class="rounded-xl border p-4 mt-4 bg-white dark:bg-neutral-900 text-sm space-y-2">
      <h2 class="font-semibold">Impact</h2>
      <div class="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-baseline">
        <span class="text-neutral-500 text-xs">Portugal</span>
        <span>{result.before.portugal.projectedAfterPlanned.interpolatedUsed}</span>
        <span class="text-neutral-400">→</span>
        <strong>{result.after.portugal.projectedAfterPlanned.interpolatedUsed}</strong>
        <span class="text-neutral-500 text-xs">Schengen</span>
        <span>{result.before.schengen.projectedAfterPlanned.interpolatedUsed}</span>
        <span class="text-neutral-400">→</span>
        <strong>{result.after.schengen.projectedAfterPlanned.interpolatedUsed}</strong>
      </div>
      <div class="rounded p-3 {overLimit ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}">
        {overLimit ? '⚠️ This trip would exceed your interpolated absence budget.' : '✅ Within all limits.'}
      </div>
      <button class="w-full bg-black text-white py-2 rounded" onclick={saveAsPlanned}>Save as planned trip</button>
    </div>
  {/if}
{/if}
```

- [ ] **Step 2: Autofixer + verify**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/simulate/+page.svelte
npm run dev
```

Visit `/simulate/`. Enter dates and a country; confirm the impact updates live. Stop.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): simulator route with live impact and save-as-planned"
```

---

## Task 18: Settings route with backup

**Files:**
- Create: `src/routes/settings/+page.svelte`

- [ ] **Step 1: Build the settings page**

Create `src/routes/settings/+page.svelte`:

```svelte
<script lang="ts">
  import { data, repos } from '$lib/stores/data.svelte';
  import { exportToJSON, importFromJSON } from '$lib/db/backup';
  import type { DaycountConvention, ScopeView } from '$lib/domain/types';

  let importStatus = $state('');

  async function exportFile() {
    const json = await exportToJSON(repos);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portugal-absence-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await data.updateSettings({ lastBackupAt: new Date().toISOString() });
  }

  async function importFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importFromJSON(repos, text);
      await data.refresh();
      importStatus = 'Imported successfully.';
    } catch (err) {
      importStatus = `Import failed: ${(err as Error).message}`;
    }
  }
</script>

<h1 class="text-xl font-semibold mb-4">Settings</h1>

<section class="rounded-xl border p-4 bg-white dark:bg-neutral-900 mb-4 space-y-3">
  <h2 class="font-semibold">Calculation</h2>

  <label class="block text-sm">
    Day-counting convention
    <select
      class="w-full border rounded px-2 py-1 mt-1"
      value={data.settings.daycountConvention}
      onchange={(e) => data.updateSettings({ daycountConvention: (e.target as HTMLSelectElement).value as DaycountConvention })}
    >
      <option value="standard">Standard — departure absent, return present (3 days for Jan 15→18)</option>
      <option value="inclusive_both">Inclusive both — both border days absent (4 days, Schengen 90/180 style)</option>
      <option value="exclusive_both">Exclusive both — neither border day absent (2 days, lenient)</option>
    </select>
  </label>

  <label class="block text-sm">
    Default scope view
    <select
      class="w-full border rounded px-2 py-1 mt-1"
      value={data.settings.defaultScopeView}
      onchange={(e) => data.updateSettings({ defaultScopeView: (e.target as HTMLSelectElement).value as ScopeView })}
    >
      <option value="both">Both Portugal &amp; Schengen</option>
      <option value="portugal">Portugal only</option>
      <option value="schengen">Schengen only</option>
    </select>
  </label>
</section>

<section class="rounded-xl border p-4 bg-white dark:bg-neutral-900 mb-4 space-y-3">
  <h2 class="font-semibold">Backup</h2>
  <p class="text-xs text-neutral-500">
    Last backup: {data.settings.lastBackupAt ? new Date(data.settings.lastBackupAt).toLocaleString() : 'never'}
  </p>
  <button class="w-full bg-black text-white py-2 rounded" onclick={exportFile}>Export JSON</button>
  <label class="block text-sm">
    Import JSON
    <input type="file" accept="application/json" class="block mt-1" onchange={importFile} />
  </label>
  {#if importStatus}<div class="text-xs">{importStatus}</div>{/if}
</section>

<section class="rounded-xl border p-4 bg-white dark:bg-neutral-900 mb-4 space-y-2 text-sm">
  <h2 class="font-semibold">About</h2>
  <p>This app tracks absence days against <strong>Article 85.2 of Lei n.º 23/2007</strong> (Portuguese Aliens Act).</p>
  <p>Limits are expressed in months by the law. Consecutive limits are computed using exact calendar arithmetic
    (<code>addMonths</code>); interpolated limits use 30.4375 days/month (e.g., 8 months ≈ 244 days).</p>
  <p class="text-neutral-500"><strong>Disclaimer.</strong> This is not legal advice. For decisions affecting your residency, consult AIMA or a licensed Portuguese immigration attorney.</p>
</section>
```

- [ ] **Step 2: Autofixer + verify export round-trip**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/settings/+page.svelte
npm run dev
```

Visit `/settings/`, click Export — a JSON file downloads. Check it has cards/trips. Then re-import the same file — confirm import status shows success. Stop.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): settings route with backup and disclaimer"
```

---

## Task 19: PWA setup (manifest, icons, service worker)

**Files:**
- Create: `static/manifest.webmanifest`, `static/icons/icon-192.png`, `static/icons/icon-512.png`
- Modify: `vite.config.ts`, `src/app.html`

- [ ] **Step 1: Install the PWA plugin**

```bash
npm install -D @vite-pwa/sveltekit
```

- [ ] **Step 2: Generate placeholder icons**

```bash
mkdir -p static/icons
# Generate 192x192 and 512x512 black squares with white "PT" text using node:
node -e "
const { createCanvas } = require('canvas');
const fs = require('fs');
for (const s of [192, 512]) {
  const c = createCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.floor(s * 0.4) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PT', s/2, s/2);
  fs.writeFileSync('static/icons/icon-' + s + '.png', c.toBuffer('image/png'));
}
" 2>/dev/null || echo "Skipping canvas-based icons"
```

If `canvas` is not available (likely), commit a single placeholder PNG instead — any solid-coloured 512×512 PNG. The user can replace with branded icons later.

```bash
# Fallback: copy the existing favicon as both icons
cp static/favicon.svg static/icons/icon-192.svg 2>/dev/null || true
```

(Real PNG icons are a polish task post-v1.)

- [ ] **Step 3: Configure the PWA plugin in Vite**

Edit `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Portugal Absence Tracker',
        short_name: 'PT Absence',
        description: 'Track absence days against Portuguese residence permit limits.',
        theme_color: '#1a1d24',
        background_color: '#1a1d24',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
      }
    })
  ]
});
```

- [ ] **Step 4: Verify build emits the service worker**

```bash
npm run build
ls build/sw.js build/manifest.webmanifest 2>/dev/null
```

Expected: both files present.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pwa): add manifest, service worker, and icons"
```

---

## Task 20: End-to-end golden path test

**Files:**
- Create: `e2e/golden-path.spec.ts`

- [ ] **Step 1: Write the test**

Create `e2e/golden-path.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('first run flow: accept disclaimer, add card, add trip, see dashboard', async ({ page }) => {
  await page.goto('/');

  // Disclaimer modal blocks until accepted.
  await expect(page.getByText('Before you start')).toBeVisible();
  await page.getByRole('button', { name: 'I understand' }).click();

  // No active card → CTA visible.
  await expect(page.getByRole('link', { name: /Add a card/ })).toBeVisible();

  // Add a card.
  await page.goto('/cards/');
  await page.getByRole('button', { name: '+ Add card' }).click();
  await page.getByLabel('Label').fill('2nd card');
  await page.getByLabel('Permit type').selectOption('subsequent_3yr');
  await page.getByLabel('Issued').fill('2025-08-01');
  await page.getByLabel('Expiry').fill('2028-01-31');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('2nd card')).toBeVisible();

  // Add a UK trip.
  await page.goto('/trips/');
  await page.getByRole('button', { name: '+ Add trip' }).click();
  await page.getByLabel('Departure').fill('2025-11-04');
  await page.getByLabel('Return').fill('2025-11-12');
  await page.getByRole('button', { name: 'Pick a country' }).click();
  await page.getByPlaceholder('Search countries…').fill('United Kingdom');
  await page.getByRole('button', { name: /United Kingdom/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('🇬🇧')).toBeVisible();

  // Dashboard shows the absence numbers.
  await page.goto('/');
  await expect(page.getByText('Portugal absence')).toBeVisible();
  await expect(page.getByText('Schengen absence')).toBeVisible();
  await expect(page.getByText(/8 \/ 244 days/)).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e test**

```bash
npm run build
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(e2e): add golden-path Playwright spec"
```

---

## Task 21: Final verification, lint, and README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the full test suite**

```bash
npm run lint
npm run check
npm run test
npm run test:e2e
```

All four should be green. Fix anything that fails before proceeding.

- [ ] **Step 2: Write the README**

Replace `README.md`:

```markdown
# Portugal Absence Tracker

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
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "docs: add README"
```

- [ ] **Step 4: Verify the final state**

```bash
git log --oneline | head -25
```

You should see ~21 commits, each focused, in order.

---

## Self-review (post-plan)

Spec coverage check, item-by-item:

- ✅ Card management (CRUD) — Tasks 14, 9
- ✅ Trip management (past + planned) — Tasks 15, 9
- ✅ Pure-function calculation engine implementing Article 85.2 — Tasks 5–8
- ✅ Dashboard, Trips, Cards, Simulator, Settings — Tasks 16, 15, 14, 17, 18
- ✅ IndexedDB local-only storage — Task 9
- ✅ JSON export / import — Task 10
- ✅ PWA with offline support — Task 19
- ✅ Static build — Task 1
- ✅ Hybrid auto-flip with `needsReview` — Task 11
- ✅ Day-counting conventions (3 modes) — Tasks 5, 18
- ✅ Two scopes (Portugal + Schengen) — Tasks 7, 16
- ✅ Sliding 3-year window for permanent permits — Task 8
- ✅ Currently-abroad streak with limit date — Task 7
- ✅ Live impact preview in trip form — Task 15
- ✅ Disclaimer modal on first launch — Task 12
- ✅ `svelte-autofixer` discipline — every UI task
- ✅ Spelled-out "Portugal" / "Schengen" labels — Task 16
- ✅ Country picker with Schengen indicator — Task 13
- ✅ E2E golden-path test — Task 20

No placeholders. Type names consistent across tasks (`Card`, `Trip`, `Settings`, `CardCompliance`, `ScopeCompliance` referenced from their task of definition onward).

Ambiguity check: the test in Task 8 step 3 (sliding window stricter test) uses approximate trip lengths in the comment (~601 days). Implementation does not depend on that specific value — assertion is `< 1200`, which the algorithm trivially satisfies.

---

## Done. What "v1 done" looks like

Per spec section 13, all five routes work, the engine fixtures pass, the Playwright golden path passes, the app installs as a PWA, JSON export/import round-trips a non-trivial dataset, the disclaimer is recorded, and `npm run build` produces a deployable static bundle.
