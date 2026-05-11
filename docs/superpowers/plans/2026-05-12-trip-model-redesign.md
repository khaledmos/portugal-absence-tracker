# Trip Model Redesign (v1.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the shipped v1 of the Portugal Residence Tracker to a v2 `Trip` schema that expresses two distinct absence intervals (Portugal + Schengen), multi-country trips, and simplified location fields — without losing any existing trip data.

**Architecture:** Iterative refactor on the shipped client-side SvelteKit PWA. Phase 1 renames Trip fields and refactors the engine to be interval-driven. Phase 2 adds the two-interval calculation logic. Phase 3 writes a pure-function Dexie + JSON migration upgrading v1 trips losslessly to v2. Phase 4 rebuilds the trip form and trip list around the new schema. Phase 5 covers E2E and final verification. Each task ends with all unit tests green and one focused commit.

**Tech Stack:** Existing stack unchanged — SvelteKit, Svelte 5 runes, TypeScript, Tailwind v4, Dexie 4 (now version 2), date-fns, Vitest, Playwright, fake-indexeddb.

**Spec:** [docs/superpowers/specs/2026-05-12-trip-model-redesign-design.md](../specs/2026-05-12-trip-model-redesign-design.md)

**Working directory:** `/Users/khaled.mostafa/Desktop/Khaled/Claude/Travel Tracker`

---

## Conventions and ground rules

- **No behavior regression.** Every task ends with `npm run test` showing all tests pass (no fewer than the 45 we started with, plus whatever new ones the task adds).
- **TDD where adding new behavior** (Task 2, Task 3, Task 5). Mechanical renames don't need a "write failing test" cycle — but tests must still be updated to match the new identifiers, and the verification step at the end of the task proves green.
- **`svelte-autofixer` MUST be run on every `.svelte` and `.svelte.ts` file you touch before committing.** Command: `npx @sveltejs/mcp svelte-autofixer ./path/to/file`. Resolve every reported issue.
- **Conventional commits.** `feat:`, `refactor:`, `test:`, `fix:`, `chore:`, `docs:`.
- **One logical change per commit.** A task may have multiple commits if it groups distinct changes.
- **Tailwind v4 syntax** (`@import "tailwindcss"`, `@theme` blocks) — same as v1.
- **Date-only dates everywhere.** `ISODate` (= `"YYYY-MM-DD"` string). All math via `date-fns`.

---

## File map (where each thing lives)

| File | Responsibility | Phase |
|---|---|---|
| `src/lib/domain/types.ts` | Trip v2 schema, new TripPurpose enum | 1 |
| `src/lib/engine/dates.ts` | `absentDaysForInterval`, `clipTrip` (clips both intervals), `daysBetween` | 1, 2 |
| `src/lib/engine/dates.test.ts` | Renamed fixtures + clipTrip dual-interval tests | 1, 2 |
| `src/lib/engine/absence.ts` | `interpolatedAbsence` / `longestConsecutiveStreak` accept an `intervalOf` selector | 1 |
| `src/lib/engine/absence.test.ts` | Renamed fixtures (still uses default = Portugal interval) | 1 |
| `src/lib/engine/compliance.ts` | Two-interval Schengen logic via `effectiveSchengenDates`, currently-abroad per scope | 1, 2 |
| `src/lib/engine/compliance.test.ts` | Renamed fixtures + new two-interval tests | 1, 2 |
| `src/lib/db/migration.ts` | Pure `migrateV1TripToV2(row)` function | 3 |
| `src/lib/db/migration.test.ts` | Migration unit tests | 3 |
| `src/lib/db/schema.ts` | SCHEMA_VERSION = 2, Dexie `version(2)` with upgrader | 3 |
| `src/lib/db/repositories.test.ts` | Fixture renames (no behavior change) | 3 |
| `src/lib/db/backup.ts` | `importFromJSON` upgrades v1 payloads | 3 |
| `src/lib/db/backup.test.ts` | v1-import test case | 3 |
| `src/lib/stores/data.svelte.ts` | (Likely no changes — passes data through) | — |
| `src/lib/components/CountriesMultiPicker.svelte` | Wraps `CountryPicker` for multi-select; emits ISO array | 4 |
| `src/routes/trips/TripForm.svelte` | B4 layout, multi-select purposes, schema v2 | 4 |
| `src/routes/trips/+page.svelte` | New card: country-only title, "Visited:" line, badges | 4 |
| `src/routes/simulate/+page.svelte` | Uses v2 field names | 4 |
| `src/routes/+page.svelte` (dashboard) | Verify no field-reference breakage | 4 |
| `src/lib/components/Timeline.svelte` | Read `portugalExitDate`/`portugalReturnDate` | 4 |
| `e2e/golden-path.spec.ts` | New labels + add Madrid-transit case | 5 |
| `README.md` | Note v1.1 redesign | 5 |

---

## Task 1: Engine rename — Trip v2 fields propagate through types and engine

**Goal:** Mechanical rename. No new behavior. Every test that passed before passes after.

**Files:**
- Modify: `src/lib/domain/types.ts`
- Modify: `src/lib/engine/dates.ts`
- Modify: `src/lib/engine/dates.test.ts`
- Modify: `src/lib/engine/absence.ts`
- Modify: `src/lib/engine/absence.test.ts`
- Modify: `src/lib/engine/compliance.ts`
- Modify: `src/lib/engine/compliance.test.ts`

- [ ] **Step 1: Update domain types to v2 schema**

Replace contents of `src/lib/domain/types.ts`:

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
  | 'personal'
  | 'tourism'
  | 'family'
  | 'medical'
  | 'other';

export type Trip = {
  id: string;
  status: TripStatus;
  needsReview?: boolean;

  // Portugal absence interval (required)
  portugalExitDate: ISODate;
  portugalReturnDate: ISODate;

  // Schengen absence sub-interval (optional)
  schengenExitDate?: ISODate;
  schengenReturnDate?: ISODate;

  // Destination
  primaryDestinationCountry: string; // ISO 3166-1 alpha-2
  otherCountriesVisited?: string[];

  // Optional border-crossing locations (free text)
  schengenExitLocation?: string;
  schengenReturnLocation?: string;

  // Multi-select purposes
  purposes?: TripPurpose[];

  notes?: string;
};

export type DaycountConvention = 'standard' | 'inclusive_both' | 'exclusive_both';

export type ScopeView = 'portugal' | 'schengen' | 'both';

export type Settings = {
  daycountConvention: DaycountConvention;
  defaultScopeView: ScopeView;
  lastBackupAt?: string;
  acceptedDisclaimerAt?: string;
};

export type CountryRecord = {
  code: string;
  name: string;
  flag: string;
  isSchengen: boolean;
};
```

- [ ] **Step 2: Refactor `src/lib/engine/dates.ts` to interval-based API**

Replace contents:

```ts
import { differenceInCalendarDays, eachDayOfInterval, format, max, min, parseISO } from 'date-fns';
import type { DaycountConvention, ISODate, Trip } from '../domain/types';

const fmt = (d: Date): ISODate => format(d, 'yyyy-MM-dd');

export function daysBetween(start: ISODate, end: ISODate): number {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

/**
 * Compute the set of "absent" ISO dates between a departure and return,
 * applying the user's day-counting convention.
 */
export function absentDaysForInterval(
  startDate: ISODate,
  endDate: ISODate,
  convention: DaycountConvention
): ISODate[] {
  const dep = parseISO(startDate);
  const ret = parseISO(endDate);

  let start: Date;
  let end: Date;

  switch (convention) {
    case 'standard':
      start = dep;
      end = new Date(ret.getTime() - 86_400_000);
      break;
    case 'inclusive_both':
      start = dep;
      end = ret;
      break;
    case 'exclusive_both':
      start = new Date(dep.getTime() + 86_400_000);
      end = new Date(ret.getTime() - 86_400_000);
      break;
  }

  if (end.getTime() < start.getTime()) return [];
  return eachDayOfInterval({ start, end }).map(fmt);
}

/**
 * Clip a trip's Portugal interval (always) and Schengen interval (if present)
 * to the supplied window. Returns null if the Portugal interval is entirely
 * outside the window. The Schengen sub-interval, if clipped to empty, is
 * dropped (set to undefined) on the returned Trip.
 */
export function clipTrip(trip: Trip, windowStart: ISODate, windowEnd: ISODate): Trip | null {
  const ws = parseISO(windowStart);
  const we = parseISO(windowEnd);
  const ptExit = parseISO(trip.portugalExitDate);
  const ptReturn = parseISO(trip.portugalReturnDate);

  if (ptReturn.getTime() < ws.getTime() || ptExit.getTime() > we.getTime()) return null;

  const clippedPtExit = fmt(max([ptExit, ws]));
  const clippedPtReturn = fmt(min([ptReturn, we]));

  let clippedSchExit: ISODate | undefined;
  let clippedSchReturn: ISODate | undefined;
  if (trip.schengenExitDate && trip.schengenReturnDate) {
    const schExit = parseISO(trip.schengenExitDate);
    const schReturn = parseISO(trip.schengenReturnDate);
    if (schReturn.getTime() >= ws.getTime() && schExit.getTime() <= we.getTime()) {
      clippedSchExit = fmt(max([schExit, ws]));
      clippedSchReturn = fmt(min([schReturn, we]));
    }
  }

  return {
    ...trip,
    portugalExitDate: clippedPtExit,
    portugalReturnDate: clippedPtReturn,
    schengenExitDate: clippedSchExit,
    schengenReturnDate: clippedSchReturn
  };
}
```

- [ ] **Step 3: Update `src/lib/engine/dates.test.ts` to new field names + API**

Replace contents:

```ts
import { describe, it, expect } from 'vitest';
import { absentDaysForInterval, clipTrip, daysBetween } from './dates';
import type { Trip } from '../domain/types';

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 't1',
  portugalExitDate: '2026-01-15',
  portugalReturnDate: '2026-01-18',
  primaryDestinationCountry: 'GB',
  status: 'past',
  ...over
});

describe('daysBetween', () => {
  it('counts inclusive days between two dates', () => {
    expect(daysBetween('2026-01-15', '2026-01-18')).toBe(4);
    expect(daysBetween('2026-01-15', '2026-01-15')).toBe(1);
  });
});

describe('absentDaysForInterval (standard convention)', () => {
  it('returns dates from start to day before end', () => {
    const days = absentDaysForInterval('2026-01-15', '2026-01-18', 'standard');
    expect(days).toEqual(['2026-01-15', '2026-01-16', '2026-01-17']);
  });

  it('returns empty for same-day intervals under standard', () => {
    const days = absentDaysForInterval('2026-01-15', '2026-01-15', 'standard');
    expect(days).toEqual([]);
  });
});

describe('absentDaysForInterval (inclusive_both convention)', () => {
  it('includes both end days', () => {
    const days = absentDaysForInterval('2026-01-15', '2026-01-18', 'inclusive_both');
    expect(days).toEqual(['2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18']);
  });
});

describe('absentDaysForInterval (exclusive_both convention)', () => {
  it('excludes both end days', () => {
    const days = absentDaysForInterval('2026-01-15', '2026-01-18', 'exclusive_both');
    expect(days).toEqual(['2026-01-16', '2026-01-17']);
  });

  it('returns empty for short trips under exclusive', () => {
    const days = absentDaysForInterval('2026-01-15', '2026-01-16', 'exclusive_both');
    expect(days).toEqual([]);
  });
});

describe('clipTrip', () => {
  it('returns the trip unchanged when entirely within window', () => {
    const t = trip({ portugalExitDate: '2026-02-01', portugalReturnDate: '2026-02-10' });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped).toEqual(t);
  });

  it('clips Portugal exit to window start', () => {
    const t = trip({ portugalExitDate: '2025-12-20', portugalReturnDate: '2026-01-10' });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped?.portugalExitDate).toBe('2026-01-01');
    expect(clipped?.portugalReturnDate).toBe('2026-01-10');
  });

  it('clips Portugal return to window end', () => {
    const t = trip({ portugalExitDate: '2026-12-25', portugalReturnDate: '2027-01-05' });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped?.portugalExitDate).toBe('2026-12-25');
    expect(clipped?.portugalReturnDate).toBe('2026-12-31');
  });

  it('returns null when trip is entirely outside the window', () => {
    const t = trip({ portugalExitDate: '2027-01-01', portugalReturnDate: '2027-01-10' });
    expect(clipTrip(t, '2026-01-01', '2026-12-31')).toBeNull();
  });

  it('clips Schengen sub-interval together with Portugal interval', () => {
    const t = trip({
      portugalExitDate: '2025-12-20',
      portugalReturnDate: '2026-01-15',
      schengenExitDate: '2025-12-22',
      schengenReturnDate: '2026-01-12'
    });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped?.portugalExitDate).toBe('2026-01-01');
    expect(clipped?.schengenExitDate).toBe('2026-01-01');
    expect(clipped?.schengenReturnDate).toBe('2026-01-12');
  });

  it('drops Schengen sub-interval when fully outside window', () => {
    const t = trip({
      portugalExitDate: '2025-12-01',
      portugalReturnDate: '2026-02-10',
      schengenExitDate: '2025-12-05',
      schengenReturnDate: '2025-12-29'
    });
    const clipped = clipTrip(t, '2026-01-01', '2026-12-31');
    expect(clipped?.portugalExitDate).toBe('2026-01-01');
    expect(clipped?.schengenExitDate).toBeUndefined();
    expect(clipped?.schengenReturnDate).toBeUndefined();
  });
});
```

- [ ] **Step 4: Refactor `src/lib/engine/absence.ts` to interval selectors**

Replace contents:

```ts
import { addDays, format, parseISO } from 'date-fns';
import type { DaycountConvention, ISODate, Trip } from '../domain/types';
import { absentDaysForInterval } from './dates';

/**
 * Optional selector: given a trip, return the date interval that should be
 * counted for this scope, or null if the trip should be skipped.
 * Default selector uses the Portugal interval (always present on a Trip).
 */
export type IntervalSelector = (trip: Trip) => readonly [ISODate, ISODate] | null;

const portugalSelector: IntervalSelector = (t) => [t.portugalExitDate, t.portugalReturnDate];

export function interpolatedAbsence(
  trips: Trip[],
  convention: DaycountConvention,
  intervalOf: IntervalSelector = portugalSelector
): number {
  const set = buildDaysSet(trips, convention, intervalOf);
  return set.size;
}

export function longestConsecutiveStreak(
  trips: Trip[],
  convention: DaycountConvention,
  intervalOf: IntervalSelector = portugalSelector
): number {
  const set = buildDaysSet(trips, convention, intervalOf);
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

function buildDaysSet(
  trips: Trip[],
  convention: DaycountConvention,
  intervalOf: IntervalSelector
): Set<ISODate> {
  const set = new Set<ISODate>();
  for (const trip of trips) {
    const interval = intervalOf(trip);
    if (!interval) continue;
    for (const d of absentDaysForInterval(interval[0], interval[1], convention)) {
      set.add(d);
    }
  }
  return set;
}
```

- [ ] **Step 5: Update `src/lib/engine/absence.test.ts` to new field names**

Replace contents:

```ts
import { describe, it, expect } from 'vitest';
import { interpolatedAbsence, longestConsecutiveStreak } from './absence';
import type { Trip } from '../domain/types';

const t = (id: string, dep: string, ret: string, country = 'GB'): Trip => ({
  id,
  portugalExitDate: dep,
  portugalReturnDate: ret,
  primaryDestinationCountry: country,
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
    const trips = [t('1', '2026-01-10', '2026-01-15'), t('2', '2026-01-12', '2026-01-20')];
    expect(interpolatedAbsence(trips, 'standard')).toBe(10);
  });

  it('handles back-to-back trips correctly under standard', () => {
    const trips = [t('1', '2026-01-10', '2026-01-18'), t('2', '2026-01-18', '2026-01-25')];
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
    expect(longestConsecutiveStreak(trips, 'standard')).toBe(5);
  });

  it('returns the longest of multiple streaks', () => {
    const trips = [
      t('1', '2026-01-10', '2026-01-13'),
      t('2', '2026-02-01', '2026-02-15'),
      t('3', '2026-03-01', '2026-03-05')
    ];
    expect(longestConsecutiveStreak(trips, 'standard')).toBe(14);
  });
});
```

- [ ] **Step 6: Update `src/lib/engine/compliance.ts` (rename only — keep single-interval behavior for now)**

Replace contents:

```ts
import { addMonths, addYears, format, parseISO } from 'date-fns';
import type { Card, DaycountConvention, Settings, Trip, ISODate } from '../domain/types';
import { isSchengen } from '../domain/countries';
import { permitRules } from '../domain/permit-rules';
import { clipTrip, daysBetween, absentDaysForInterval } from './dates';
import {
  interpolatedAbsence,
  longestConsecutiveStreak,
  type IntervalSelector
} from './absence';

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

const portugalInterval: IntervalSelector = (t) => [t.portugalExitDate, t.portugalReturnDate];

const schengenInterval: IntervalSelector = (t) => {
  if (isSchengen(t.primaryDestinationCountry)) return null;
  const exit = t.schengenExitDate ?? t.portugalExitDate;
  const ret = t.schengenReturnDate ?? t.portugalReturnDate;
  return [exit, ret];
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
  const expiry = parseISO(card.expiryDate);
  const elapsedClampedEnd = todayDate.getTime() < expiry.getTime() ? todayDate : expiry;
  const elapsedDays = Math.max(
    0,
    daysBetween(card.issuedDate, format(elapsedClampedEnd, 'yyyy-MM-dd'))
  );

  const clipped = trips
    .map((t) => clipTrip(t, card.issuedDate, card.expiryDate))
    .filter((t): t is Trip => t !== null);

  const past = clipped.filter((t) => t.status === 'past');
  const planned = clipped.filter((t) => t.status === 'planned');

  return {
    cardId: card.id,
    validityDays,
    elapsedDays,
    portugal: scopeFor(past, planned, settings, todayDate, rule, portugalInterval),
    schengen: scopeFor(past, planned, settings, todayDate, rule, schengenInterval)
  };
}

function scopeFor(
  past: Trip[],
  planned: Trip[],
  settings: Settings,
  today: Date,
  rule: ReturnType<typeof permitRules>,
  intervalOf: IntervalSelector
): ScopeCompliance {
  const conv = settings.daycountConvention;

  const interpolatedUsed =
    rule.windowYears > 0
      ? maxInterpolatedInSlidingWindow(past, conv, rule.windowYears, intervalOf)
      : interpolatedAbsence(past, conv, intervalOf);
  const consecutiveUsed = longestConsecutiveStreak(past, conv, intervalOf);

  let currentlyAbroad = false;
  let currentStreakDays: number | undefined;
  let limitDate: ISODate | undefined;
  for (const trip of past) {
    const interval = intervalOf(trip);
    if (!interval) continue;
    const dep = parseISO(interval[0]);
    const ret = parseISO(interval[1]);
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

  const projectedTrips = [...past, ...planned];
  const projectedInterpolated =
    rule.windowYears > 0
      ? maxInterpolatedInSlidingWindow(projectedTrips, conv, rule.windowYears, intervalOf)
      : interpolatedAbsence(projectedTrips, conv, intervalOf);
  const projectedConsecutive = longestConsecutiveStreak(projectedTrips, conv, intervalOf);

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

function maxInterpolatedInSlidingWindow(
  trips: Trip[],
  convention: DaycountConvention,
  windowYears: number,
  intervalOf: IntervalSelector
): number {
  if (trips.length === 0) return 0;
  // Candidate window starts: each trip's Portugal exit date (the broader interval).
  const starts = trips.map((t) => t.portugalExitDate);
  let best = 0;
  for (const start of starts) {
    const end = format(addYears(parseISO(start), windowYears), 'yyyy-MM-dd');
    const clipped = trips
      .map((t) => clipTrip(t, start, end))
      .filter((t): t is Trip => t !== null);
    const value = interpolatedAbsence(clipped, convention, intervalOf);
    if (value > best) best = value;
  }
  // Suppress unused import warning — absentDaysForInterval is re-exported via dates.
  void absentDaysForInterval;
  return best;
}
```

- [ ] **Step 7: Update `src/lib/engine/compliance.test.ts` field names (no new tests yet — those come in Task 2)**

Replace contents:

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
  portugalExitDate: '2026-01-10',
  portugalReturnDate: '2026-01-15',
  primaryDestinationCountry: 'GB',
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
      trips: [
        trip({
          portugalExitDate: '2025-11-04',
          portugalReturnDate: '2025-11-12',
          primaryDestinationCountry: 'GB'
        })
      ],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.interpolated.used).toBe(8);
    expect(r.schengen.interpolated.used).toBe(8);
  });

  it('counts a Madrid trip in Portugal scope only', () => {
    const r = computeCardCompliance({
      card,
      trips: [
        trip({
          portugalExitDate: '2025-09-12',
          portugalReturnDate: '2025-09-15',
          primaryDestinationCountry: 'ES'
        })
      ],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.interpolated.used).toBe(3);
    expect(r.schengen.interpolated.used).toBe(0);
  });

  it('clips trips to card validity', () => {
    const r = computeCardCompliance({
      card,
      trips: [
        trip({
          portugalExitDate: '2025-07-25',
          portugalReturnDate: '2025-08-05',
          primaryDestinationCountry: 'GB'
        })
      ],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.interpolated.used).toBe(4);
  });

  it('detects currently-abroad and computes streak + limit date', () => {
    const r = computeCardCompliance({
      card,
      trips: [
        trip({
          portugalExitDate: '2026-05-04',
          portugalReturnDate: '2026-05-14',
          primaryDestinationCountry: 'GB'
        })
      ],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.consecutive.currentlyAbroad).toBe(true);
    expect(r.portugal.consecutive.currentStreakDays).toBe(7);
    expect(r.portugal.consecutive.limitDate).toBe('2026-11-04');
  });

  it('separates past and planned in projection', () => {
    const r = computeCardCompliance({
      card,
      trips: [
        trip({
          portugalExitDate: '2025-11-04',
          portugalReturnDate: '2025-11-12',
          primaryDestinationCountry: 'GB',
          status: 'past'
        }),
        trip({
          portugalExitDate: '2026-09-02',
          portugalReturnDate: '2026-09-13',
          primaryDestinationCountry: 'TR',
          status: 'planned'
        })
      ],
      today: '2026-05-10',
      settings
    });
    expect(r.portugal.interpolated.used).toBe(8);
    expect(r.portugal.projectedAfterPlanned.interpolatedUsed).toBe(8 + 11);
  });

  it('exposes correct budgets per permit type', () => {
    const r = computeCardCompliance({ card, trips: [], today: '2026-05-10', settings });
    expect(r.portugal.consecutive.budgetMonths).toBe(6);
    expect(r.portugal.interpolated.budgetDays).toBe(244);
    expect(r.portugal.interpolated.budgetMonthsLabel).toBe('8 months (≈244 days)');
  });

  it('reports elapsed and validity days', () => {
    const r = computeCardCompliance({ card, trips: [], today: '2026-05-10', settings });
    expect(r.validityDays).toBe(914);
    expect(r.elapsedDays).toBe(283);
  });
});

describe('computeCardCompliance — permanent_5yr', () => {
  const permCard: Card = {
    id: 'p1',
    label: 'Permanent',
    type: 'permanent_5yr',
    issuedDate: '2025-01-01',
    expiryDate: '2030-01-01'
  };

  it('uses the largest interpolated value across any 3-year window', () => {
    const big: Trip = {
      id: 'big',
      portugalExitDate: '2027-01-01',
      portugalReturnDate: '2029-08-08',
      primaryDestinationCountry: 'GB',
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

  it('reports a smaller interpolated count when the trips are spread over 5 years', () => {
    const t1: Trip = {
      id: 't1',
      portugalExitDate: '2025-02-01',
      portugalReturnDate: '2026-09-25',
      primaryDestinationCountry: 'GB',
      status: 'past'
    };
    const t2: Trip = {
      id: 't2',
      portugalExitDate: '2027-09-26',
      portugalReturnDate: '2029-05-19',
      primaryDestinationCountry: 'GB',
      status: 'past'
    };
    const r = computeCardCompliance({
      card: permCard,
      trips: [t1, t2],
      today: '2030-01-01',
      settings
    });
    expect(r.portugal.interpolated.used).toBeLessThan(1200);
  });
});
```

- [ ] **Step 8: Run the engine tests — all should pass**

Run:

```bash
npm run test
```

Expected: `Test Files  7 passed (7)`, `Tests  45 passed (45)`. Existing 45 tests + 2 new clipTrip-dual-interval tests = **47 passed**.

If anything fails, fix the offending file before moving on. Do NOT proceed to Task 2 until green.

- [ ] **Step 9: Run lint and svelte-check**

```bash
npm run check
npm run lint
```

Both must be clean.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(engine): rename Trip fields to portugalExit/Return + interval-selector engine"
```

---

## Task 2: Two-interval Schengen behavior + new tests

**Goal:** The engine already supports interval selectors after Task 1. This task adds the targeted tests that prove the two-interval behavior works correctly and adds the otherCountriesVisited safety test. No production-code changes expected (compliance.ts already uses `schengenInterval`); if a test fails, fix the engine.

**Files:**
- Modify: `src/lib/engine/compliance.test.ts`

- [ ] **Step 1: Append new test suite to `src/lib/engine/compliance.test.ts`**

Append the following blocks at the end of the file (after the existing `describe` blocks):

```ts
describe('computeCardCompliance — two-interval Schengen', () => {
  it('uses explicit Schengen dates when both are set (Madrid transit case)', () => {
    // Left Portugal Mon 2026-05-04, transited via Madrid one day,
    // exited Schengen Tue 2026-05-05 to Istanbul, returned via Madrid
    // and back to Portugal Sun 2026-05-17. Schengen out 12 days; Portugal out 13.
    const t: Trip = {
      id: 't-madrid',
      portugalExitDate: '2026-05-04',
      portugalReturnDate: '2026-05-17',
      schengenExitDate: '2026-05-05',
      schengenReturnDate: '2026-05-17',
      primaryDestinationCountry: 'TR',
      status: 'past'
    };
    const r = computeCardCompliance({ card, trips: [t], today: '2026-06-01', settings });
    expect(r.portugal.interpolated.used).toBe(13);
    expect(r.schengen.interpolated.used).toBe(12);
  });

  it('defaults Schengen interval to Portugal interval when no explicit dates given', () => {
    const t: Trip = {
      id: 't-direct',
      portugalExitDate: '2026-05-04',
      portugalReturnDate: '2026-05-14',
      primaryDestinationCountry: 'TR',
      status: 'past'
    };
    const r = computeCardCompliance({ card, trips: [t], today: '2026-06-01', settings });
    expect(r.portugal.interpolated.used).toBe(10);
    expect(r.schengen.interpolated.used).toBe(10);
  });

  it('contributes zero Schengen days for trips whose primary destination is in Schengen', () => {
    const t: Trip = {
      id: 't-paris',
      portugalExitDate: '2026-05-04',
      portugalReturnDate: '2026-05-08',
      primaryDestinationCountry: 'FR',
      status: 'past'
    };
    const r = computeCardCompliance({ card, trips: [t], today: '2026-06-01', settings });
    expect(r.portugal.interpolated.used).toBe(4);
    expect(r.schengen.interpolated.used).toBe(0);
  });

  it('ignores otherCountriesVisited entirely (calculation depends only on dates)', () => {
    const without: Trip = {
      id: 't-without',
      portugalExitDate: '2026-05-04',
      portugalReturnDate: '2026-05-14',
      primaryDestinationCountry: 'TR',
      status: 'past'
    };
    const withList: Trip = {
      ...without,
      id: 't-with',
      otherCountriesVisited: ['EG', 'MA']
    };
    const r1 = computeCardCompliance({ card, trips: [without], today: '2026-06-01', settings });
    const r2 = computeCardCompliance({
      card,
      trips: [withList],
      today: '2026-06-01',
      settings
    });
    expect(r1.portugal.interpolated.used).toBe(r2.portugal.interpolated.used);
    expect(r1.schengen.interpolated.used).toBe(r2.schengen.interpolated.used);
  });

  it('reports Portugal-abroad but not Schengen-abroad when currently in a Schengen transit country', () => {
    // User is in Madrid today (en route to Istanbul tomorrow).
    const t: Trip = {
      id: 't-transit-now',
      portugalExitDate: '2026-05-09',
      portugalReturnDate: '2026-05-20',
      schengenExitDate: '2026-05-11', // not yet — today is 2026-05-10
      schengenReturnDate: '2026-05-20',
      primaryDestinationCountry: 'TR',
      status: 'past'
    };
    const r = computeCardCompliance({ card, trips: [t], today: '2026-05-10', settings });
    expect(r.portugal.consecutive.currentlyAbroad).toBe(true);
    expect(r.schengen.consecutive.currentlyAbroad).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests — they should pass**

```bash
npm run test -- compliance
```

Expected: PASS. The two-interval behavior should already be implemented by the Task-1 refactor; these new tests verify it.

If any fail, debug `src/lib/engine/compliance.ts` (likely candidates: the `schengenInterval` selector, or the currently-abroad loop iterating on the right interval). Do not work around — fix.

- [ ] **Step 3: Run the full test suite**

```bash
npm run test
```

Expected: all 47 + 5 = **52 tests pass**.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(engine): cover two-interval Schengen behavior and otherCountriesVisited invariance"
```

---

## Task 3: Migration module (pure function + tests)

**Goal:** Pure function that takes a v1 Trip row (raw `any`, since the v1 type has been removed) and returns a v2 `Trip`. Used by both the Dexie upgrade hook and `importFromJSON`.

**Files:**
- Create: `src/lib/db/migration.ts`
- Create: `src/lib/db/migration.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/db/migration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { migrateV1TripToV2 } from './migration';

describe('migrateV1TripToV2', () => {
  it('renames departureDate/returnDate to portugalExit/portugalReturn', () => {
    const v1 = {
      id: 't1',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past'
    };
    const v2 = migrateV1TripToV2(v1);
    expect(v2.portugalExitDate).toBe('2026-01-10');
    expect(v2.portugalReturnDate).toBe('2026-01-15');
    expect(v2.primaryDestinationCountry).toBe('GB');
    expect((v2 as unknown as Record<string, unknown>).departureDate).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).returnDate).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).destinationCountry).toBeUndefined();
  });

  it('converts single purpose to a purposes array', () => {
    const v1 = {
      id: 't1',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past',
      purpose: 'business'
    };
    const v2 = migrateV1TripToV2(v1);
    expect(v2.purposes).toEqual(['business']);
    expect((v2 as unknown as Record<string, unknown>).purpose).toBeUndefined();
  });

  it('maps deprecated purposes cultural/social to tourism', () => {
    expect(
      migrateV1TripToV2({
        id: 't',
        departureDate: '2026-01-10',
        returnDate: '2026-01-15',
        destinationCountry: 'GB',
        status: 'past',
        purpose: 'cultural'
      }).purposes
    ).toEqual(['tourism']);

    expect(
      migrateV1TripToV2({
        id: 't',
        departureDate: '2026-01-10',
        returnDate: '2026-01-15',
        destinationCountry: 'GB',
        status: 'past',
        purpose: 'social'
      }).purposes
    ).toEqual(['tourism']);
  });

  it('omits purposes when v1 had no purpose', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past'
    });
    expect(v2.purposes).toBeUndefined();
  });

  it('migrates city + airports into the notes field', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      destinationCity: 'London',
      departureAirport: 'LIS',
      arrivalAirport: 'LHR',
      status: 'past'
    });
    expect(v2.notes).toBe('City: London. From: LIS. To: LHR.');
    expect((v2 as unknown as Record<string, unknown>).destinationCity).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).departureAirport).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).arrivalAirport).toBeUndefined();
  });

  it('preserves and prepends to existing notes', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      destinationCity: 'London',
      status: 'past',
      notes: 'work conference'
    });
    expect(v2.notes).toBe('City: London. work conference');
  });

  it('passes through fields that already match v2 (id, status, needsReview)', () => {
    const v2 = migrateV1TripToV2({
      id: 't42',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'planned',
      needsReview: true
    });
    expect(v2.id).toBe('t42');
    expect(v2.status).toBe('planned');
    expect(v2.needsReview).toBe(true);
  });

  it('does not set Schengen-specific fields on migrated trips', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'TR',
      status: 'past'
    });
    expect(v2.schengenExitDate).toBeUndefined();
    expect(v2.schengenReturnDate).toBeUndefined();
    expect(v2.schengenExitLocation).toBeUndefined();
    expect(v2.schengenReturnLocation).toBeUndefined();
  });

  it('returns a Trip whose engine-relevant invariants are satisfied', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2025-11-04',
      returnDate: '2025-11-12',
      destinationCountry: 'GB',
      status: 'past'
    });
    expect(v2.portugalExitDate <= v2.portugalReturnDate).toBe(true);
    expect(typeof v2.primaryDestinationCountry).toBe('string');
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npm run test -- migration
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the migration**

Create `src/lib/db/migration.ts`:

```ts
import type { Trip, TripPurpose } from '../domain/types';

/**
 * Transform a v1 Trip row into a v2 Trip.
 * - Renames departureDate/returnDate/destinationCountry to v2 names.
 * - Converts single `purpose` to a `purposes` array; maps cultural/social → tourism.
 * - Folds destinationCity, departureAirport, arrivalAirport into `notes` (prepended).
 * - Leaves Schengen-specific fields undefined (existing data has no transit info).
 *
 * Pure function: no side effects, deterministic.
 */
export function migrateV1TripToV2(row: Record<string, unknown>): Trip {
  const get = (k: string) => row[k];

  const purposeMap: Record<string, TripPurpose> = {
    cultural: 'tourism',
    social: 'tourism',
    business: 'business',
    work: 'work',
    personal: 'personal',
    medical: 'medical'
  };

  const oldPurpose = get('purpose') as string | undefined;
  const purposes: TripPurpose[] | undefined =
    oldPurpose && purposeMap[oldPurpose] ? [purposeMap[oldPurpose]] : undefined;

  const noteFragments: string[] = [];
  if (get('destinationCity')) noteFragments.push(`City: ${get('destinationCity')}`);
  if (get('departureAirport')) noteFragments.push(`From: ${get('departureAirport')}`);
  if (get('arrivalAirport')) noteFragments.push(`To: ${get('arrivalAirport')}`);

  const existingNotes = get('notes') as string | undefined;
  const combinedNotes =
    noteFragments.length > 0
      ? [noteFragments.join('. ') + '.', existingNotes].filter(Boolean).join(' ')
      : existingNotes;

  return {
    id: String(get('id')),
    status: get('status') as Trip['status'],
    needsReview: get('needsReview') as boolean | undefined,
    portugalExitDate: String(get('departureDate')),
    portugalReturnDate: String(get('returnDate')),
    primaryDestinationCountry: String(get('destinationCountry')),
    purposes,
    notes: combinedNotes
  };
}
```

- [ ] **Step 4: Run, expect green**

```bash
npm run test -- migration
```

Expected: 9 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: 52 + 9 = **61 tests pass**.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): add migrateV1TripToV2 pure function"
```

---

## Task 4: Bump Dexie schema to version 2 with upgrade hook

**Goal:** Open the existing IndexedDB and apply the migration to every existing Trip row exactly once.

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/repositories.test.ts` (fixture field renames only)

- [ ] **Step 1: Update `src/lib/db/schema.ts`**

Replace contents:

```ts
import Dexie, { type Table } from 'dexie';
import type { Card, Trip, Settings } from '../domain/types';
import { migrateV1TripToV2 } from './migration';

export const SCHEMA_VERSION = 2;

export class TrackerDB extends Dexie {
  cards!: Table<Card, string>;
  trips!: Table<Trip, string>;
  settings!: Table<{ id: string; value: Settings }, string>;

  constructor(name = 'pt-residence-tracker') {
    super(name);

    // v1 (shipped 2026-05-11)
    this.version(1).stores({
      cards: 'id, issuedDate, expiryDate, archived',
      trips: 'id, departureDate, returnDate, status, destinationCountry',
      settings: 'id'
    });

    // v2 (2026-05-12): rename Trip fields, add Schengen sub-interval, multi-purpose.
    // Indexed fields change: trips now indexed on portugalExitDate/portugalReturnDate/primaryDestinationCountry.
    this.version(2)
      .stores({
        cards: 'id, issuedDate, expiryDate, archived',
        trips: 'id, portugalExitDate, portugalReturnDate, status, primaryDestinationCountry',
        settings: 'id'
      })
      .upgrade((tx) => {
        return tx
          .table('trips')
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            const migrated = migrateV1TripToV2(t);
            // Replace the row in place by deleting old keys and assigning v2 keys.
            for (const key of Object.keys(t)) delete t[key];
            Object.assign(t, migrated);
          });
      });
  }
}

export const db = new TrackerDB();
```

- [ ] **Step 2: Update `src/lib/db/repositories.test.ts` to use new field names**

Replace contents:

```ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerDB } from './schema';
import { makeRepos } from './repositories';
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
      id: 'c1',
      label: 'old',
      type: 'initial_2yr',
      issuedDate: '2023-07-15',
      expiryDate: '2025-07-14'
    };
    const c2: Card = {
      id: 'c2',
      label: 'new',
      type: 'subsequent_3yr',
      issuedDate: '2025-08-01',
      expiryDate: '2028-01-31'
    };
    await repos.cards.put(c1);
    await repos.cards.put(c2);
    const active = await repos.cards.activeAt('2026-05-10');
    expect(active?.id).toBe('c2');
  });

  it('returns null when no card is active', async () => {
    const c: Card = {
      id: 'c1',
      label: 'old',
      type: 'initial_2yr',
      issuedDate: '2020-01-01',
      expiryDate: '2022-01-01'
    };
    await repos.cards.put(c);
    expect(await repos.cards.activeAt('2026-05-10')).toBeNull();
  });
});

describe('TripRepo', () => {
  it('creates, lists, and deletes trips', async () => {
    const t: Trip = {
      id: 't1',
      portugalExitDate: '2026-01-10',
      portugalReturnDate: '2026-01-15',
      primaryDestinationCountry: 'GB',
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
      portugalExitDate: '2026-04-01',
      portugalReturnDate: '2026-04-10',
      primaryDestinationCountry: 'GB',
      status: 'planned'
    };
    const future: Trip = {
      id: 'f',
      portugalExitDate: '2026-12-01',
      portugalReturnDate: '2026-12-10',
      primaryDestinationCountry: 'GB',
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

- [ ] **Step 3: Update `src/lib/db/repositories.ts` to use new indexed field**

Replace contents:

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
  list = () => this.db.trips.orderBy('portugalExitDate').toArray();
  get = (id: string) => this.db.trips.get(id);
  put = (trip: Trip) => this.db.trips.put(trip);
  delete = (id: string) => this.db.trips.delete(id);
  async plannedOverdue(today: ISODate): Promise<Trip[]> {
    const all = await this.list();
    return all.filter((t) => t.status === 'planned' && t.portugalReturnDate < today);
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

- [ ] **Step 4: Add an upgrade-path integration test**

Append the following describe block to `src/lib/db/repositories.test.ts` (at the very end):

```ts
describe('Dexie v1 → v2 upgrade', () => {
  it('migrates an existing v1 database in place', async () => {
    const dbName = 'upgrade-test-' + Math.random().toString(36).slice(2);

    // Step 1: open the v1 schema and insert a v1-shaped trip
    const v1Db = new (await import('dexie')).default(dbName);
    v1Db.version(1).stores({
      cards: 'id, issuedDate, expiryDate, archived',
      trips: 'id, departureDate, returnDate, status, destinationCountry',
      settings: 'id'
    });
    await v1Db.open();
    await v1Db.table('trips').put({
      id: 'legacy-1',
      departureDate: '2025-11-04',
      returnDate: '2025-11-12',
      destinationCountry: 'GB',
      destinationCity: 'London',
      departureAirport: 'LIS',
      arrivalAirport: 'LHR',
      status: 'past',
      purpose: 'cultural'
    });
    v1Db.close();

    // Step 2: reopen with v2 schema — upgrade runs
    const v2Db = new TrackerDB(dbName);
    await v2Db.open();
    const migrated = await v2Db.trips.get('legacy-1');
    expect(migrated).toBeTruthy();
    expect(migrated?.portugalExitDate).toBe('2025-11-04');
    expect(migrated?.portugalReturnDate).toBe('2025-11-12');
    expect(migrated?.primaryDestinationCountry).toBe('GB');
    expect(migrated?.purposes).toEqual(['tourism']);
    expect(migrated?.notes).toBe('City: London. From: LIS. To: LHR.');
    expect((migrated as unknown as Record<string, unknown>).departureDate).toBeUndefined();
    v2Db.close();
  });
});
```

- [ ] **Step 5: Run repositories tests**

```bash
npm run test -- repositories
```

Expected: 7 original + 1 new upgrade test = **8 tests pass**.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: 61 + 1 = **62 tests pass**.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): bump Dexie schema to v2 with in-place trip migration"
```

---

## Task 5: JSON import handles v1 envelopes

**Goal:** `importFromJSON` accepts schemaVersion 1 OR 2. v1 payloads get migrated trip-by-trip before insert.

**Files:**
- Modify: `src/lib/db/backup.ts`
- Modify: `src/lib/db/backup.test.ts`

- [ ] **Step 1: Add a failing test for v1 import**

Append to `src/lib/db/backup.test.ts`:

```ts
describe('importFromJSON — v1 envelopes', () => {
  it('upgrades a v1 trip payload to v2 schema on import', async () => {
    const v1Payload = {
      schemaVersion: 1,
      exportedAt: '2026-05-11T12:00:00Z',
      cards: [
        {
          id: 'c1',
          label: '2nd card',
          type: 'subsequent_3yr',
          issuedDate: '2025-08-01',
          expiryDate: '2028-01-31'
        }
      ],
      trips: [
        {
          id: 't1',
          departureDate: '2025-11-04',
          returnDate: '2025-11-12',
          destinationCountry: 'GB',
          destinationCity: 'London',
          status: 'past',
          purpose: 'business'
        }
      ],
      settings: { daycountConvention: 'standard', defaultScopeView: 'both' }
    };
    await importFromJSON(repos, JSON.stringify(v1Payload));
    const trips = await repos.trips.list();
    expect(trips).toHaveLength(1);
    expect(trips[0].portugalExitDate).toBe('2025-11-04');
    expect(trips[0].primaryDestinationCountry).toBe('GB');
    expect(trips[0].purposes).toEqual(['business']);
    expect(trips[0].notes).toBe('City: London.');
  });

  it('rejects schemaVersion 3 (newer than supported)', async () => {
    const future = JSON.stringify({ schemaVersion: 3, cards: [], trips: [], settings: {} });
    await expect(importFromJSON(repos, future)).rejects.toThrow(/schema version/i);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npm run test -- backup
```

Expected: FAIL — v1 trips currently land with departureDate, not portugalExitDate (the existing importFromJSON does a raw insert that bypasses migration).

- [ ] **Step 3: Update `src/lib/db/backup.ts`**

Replace contents:

```ts
import { SCHEMA_VERSION } from './schema';
import { migrateV1TripToV2 } from './migration';
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

export async function importFromJSON(
  repos: ReturnType<typeof makeRepos>,
  raw: string
): Promise<void> {
  const parsed = JSON.parse(raw);
  const incomingVersion = parsed.schemaVersion;

  if (incomingVersion !== 1 && incomingVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${incomingVersion}`);
  }

  // Wipe existing rows
  const allCards = await repos.cards.list();
  for (const c of allCards) await repos.cards.delete(c.id);
  const allTrips = await repos.trips.list();
  for (const t of allTrips) await repos.trips.delete(t.id);

  // Cards: schema unchanged between v1 and v2, write as-is
  for (const c of parsed.cards ?? []) await repos.cards.put(c);

  // Trips: migrate if incoming is v1
  for (const t of parsed.trips ?? []) {
    const v2Trip = incomingVersion === 1 ? migrateV1TripToV2(t) : t;
    await repos.trips.put(v2Trip);
  }

  if (parsed.settings) await repos.settings.update(parsed.settings);
  await repos.settings.update({ lastBackupAt: new Date().toISOString() });
}
```

- [ ] **Step 4: Run, expect green**

```bash
npm run test -- backup
```

Expected: 3 original + 2 new = **5 tests pass**.

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: 62 + 2 = **64 tests pass**.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): importFromJSON handles v1 envelopes via migration"
```

---

## Task 6: CountriesMultiPicker component

**Goal:** Reusable multi-select wrapping the existing `CountryPicker`. Used in `TripForm` for `otherCountriesVisited`.

**Files:**
- Create: `src/lib/components/CountriesMultiPicker.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/components/CountriesMultiPicker.svelte`:

```svelte
<script lang="ts">
  import CountryPicker from './CountryPicker.svelte';
  import { countryFlag, countryName } from '$lib/domain/countries';

  let {
    value = $bindable<string[]>([])
  }: {
    value?: string[];
  } = $props();

  let adding = $state(false);
  let draft = $state('');

  function add() {
    const code = draft.trim();
    if (code && !value.includes(code)) {
      value = [...value, code];
    }
    draft = '';
    adding = false;
  }

  function remove(code: string) {
    value = value.filter((c) => c !== code);
  }
</script>

<div class="space-y-2">
  {#if value.length > 0}
    <ul class="flex flex-wrap gap-1.5">
      {#each value as code (code)}
        <li
          class="flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs dark:bg-neutral-800"
        >
          <span>{countryFlag(code)} {countryName(code)}</span>
          <button
            type="button"
            class="text-neutral-400 hover:text-red-700"
            aria-label="Remove {countryName(code)}"
            onclick={() => remove(code)}>×</button
          >
        </li>
      {/each}
    </ul>
  {/if}

  {#if adding}
    <div class="space-y-2">
      <CountryPicker bind:value={draft} placeholder="Search countries…" />
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded bg-black py-1.5 text-sm text-white disabled:opacity-50"
          disabled={!draft}
          onclick={add}>Add</button
        >
        <button
          type="button"
          class="flex-1 rounded bg-neutral-200 py-1.5 text-sm dark:bg-neutral-700"
          onclick={() => {
            adding = false;
            draft = '';
          }}>Cancel</button
        >
      </div>
    </div>
  {:else}
    <button
      type="button"
      class="rounded border border-dashed px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      onclick={() => (adding = true)}>+ Add another country</button
    >
  {/if}
</div>
```

- [ ] **Step 2: Autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/lib/components/CountriesMultiPicker.svelte
```

Resolve any reported issues. (Likely none; mirror the patterns used in `CountryPicker.svelte`.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): add CountriesMultiPicker component for trip diary"
```

---

## Task 7: Rewrite TripForm with B4 layout

**Goal:** New form with all v2 fields, B4-pattern Schengen dates (mirrored by default), multi-select purposes, helper text exactly as specified.

**Files:**
- Modify: `src/routes/trips/TripForm.svelte`

- [ ] **Step 1: Replace `src/routes/trips/TripForm.svelte`**

Replace contents:

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import { isSchengen } from '$lib/domain/countries';
  import CountryPicker from '$lib/components/CountryPicker.svelte';
  import CountriesMultiPicker from '$lib/components/CountriesMultiPicker.svelte';
  import type { Trip, TripStatus, TripPurpose } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  let { initial, onClose }: { initial?: Trip; onClose: () => void } = $props();

  // Form state (snapshot the initial prop at mount via untrack — parent recreates on edit switch)
  let status = $state<TripStatus>(untrack(() => initial?.status ?? 'past'));
  let portugalExitDate = $state(untrack(() => initial?.portugalExitDate ?? ''));
  let portugalReturnDate = $state(untrack(() => initial?.portugalReturnDate ?? ''));
  let schengenExitDate = $state(untrack(() => initial?.schengenExitDate ?? ''));
  let schengenReturnDate = $state(untrack(() => initial?.schengenReturnDate ?? ''));
  let primaryDestinationCountry = $state(
    untrack(() => initial?.primaryDestinationCountry ?? '')
  );
  let otherCountriesVisited = $state<string[]>(
    untrack(() => initial?.otherCountriesVisited ?? [])
  );
  let schengenExitLocation = $state(untrack(() => initial?.schengenExitLocation ?? ''));
  let schengenReturnLocation = $state(untrack(() => initial?.schengenReturnLocation ?? ''));
  let purposes = $state<TripPurpose[]>(untrack(() => initial?.purposes ?? []));
  let notes = $state(untrack(() => initial?.notes ?? ''));

  // Schengen-date auto-mirror: as long as the user hasn't explicitly edited
  // the Schengen dates, keep them in sync with Portugal dates.
  let schengenDatesTouched = $state(
    untrack(
      () =>
        !!(
          initial?.schengenExitDate &&
          (initial.schengenExitDate !== initial.portugalExitDate ||
            initial.schengenReturnDate !== initial.portugalReturnDate)
        )
    )
  );

  $effect(() => {
    if (!schengenDatesTouched) {
      schengenExitDate = portugalExitDate;
      schengenReturnDate = portugalReturnDate;
    }
  });

  const destinationIsSchengen = $derived(
    primaryDestinationCountry ? isSchengen(primaryDestinationCountry) : false
  );

  const allPurposes: { id: TripPurpose; label: string }[] = [
    { id: 'business', label: 'Business' },
    { id: 'work', label: 'Work' },
    { id: 'personal', label: 'Personal' },
    { id: 'tourism', label: 'Tourism' },
    { id: 'family', label: 'Family' },
    { id: 'medical', label: 'Medical' },
    { id: 'other', label: 'Other' }
  ];

  function togglePurpose(p: TripPurpose) {
    purposes = purposes.includes(p) ? purposes.filter((x) => x !== p) : [...purposes, p];
  }

  // Live impact preview
  const today = todayISO();
  const activeCard = $derived(
    data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate) ?? null
  );

  const draft: Trip = $derived({
    id: initial?.id ?? '__draft__',
    status,
    portugalExitDate,
    portugalReturnDate,
    schengenExitDate: destinationIsSchengen ? undefined : schengenExitDate || undefined,
    schengenReturnDate: destinationIsSchengen ? undefined : schengenReturnDate || undefined,
    primaryDestinationCountry,
    otherCountriesVisited: otherCountriesVisited.length > 0 ? otherCountriesVisited : undefined,
    schengenExitLocation: schengenExitLocation || undefined,
    schengenReturnLocation: schengenReturnLocation || undefined,
    purposes: purposes.length > 0 ? purposes : undefined,
    notes: notes || undefined
  });

  const preview = $derived.by(() => {
    if (!activeCard || !portugalExitDate || !portugalReturnDate || !primaryDestinationCountry) {
      return null;
    }
    const before = computeCardCompliance({
      card: activeCard,
      trips: data.trips,
      today,
      settings: data.settings
    });
    const trips = initial
      ? data.trips.map((t) => (t.id === initial.id ? draft : t))
      : [...data.trips, draft];
    const after = computeCardCompliance({
      card: activeCard,
      trips,
      today,
      settings: data.settings
    });
    return { before, after };
  });

  async function save() {
    if (!primaryDestinationCountry || !portugalExitDate || !portugalReturnDate) return;
    const trip: Trip = {
      id: initial?.id ?? uuid(),
      status,
      needsReview: false,
      portugalExitDate,
      portugalReturnDate,
      schengenExitDate: destinationIsSchengen ? undefined : schengenExitDate || undefined,
      schengenReturnDate: destinationIsSchengen ? undefined : schengenReturnDate || undefined,
      primaryDestinationCountry,
      otherCountriesVisited: otherCountriesVisited.length > 0 ? otherCountriesVisited : undefined,
      schengenExitLocation: destinationIsSchengen
        ? undefined
        : schengenExitLocation || undefined,
      schengenReturnLocation: destinationIsSchengen
        ? undefined
        : schengenReturnLocation || undefined,
      purposes: purposes.length > 0 ? purposes : undefined,
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

<div class="space-y-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <h3 class="font-semibold">{initial ? 'Edit' : 'New'} trip</h3>

  <!-- Status -->
  <div class="flex gap-2">
    <button
      class="flex-1 rounded border py-1 {status === 'past' ? 'bg-black text-white' : ''}"
      onclick={() => (status = 'past')}>Past</button
    >
    <button
      class="flex-1 rounded border py-1 {status === 'planned' ? 'bg-black text-white' : ''}"
      onclick={() => (status = 'planned')}>Planned</button
    >
  </div>

  <!-- Portugal dates -->
  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm"
      >Left Portugal
      <input
        type="date"
        class="mt-1 w-full rounded border px-2 py-1"
        bind:value={portugalExitDate}
      />
    </label>
    <label class="block text-sm"
      >Returned to Portugal
      <input
        type="date"
        class="mt-1 w-full rounded border px-2 py-1"
        bind:value={portugalReturnDate}
      />
    </label>
  </div>

  <!-- Destination -->
  <div class="text-sm">
    <div class="mb-1">Primary destination country</div>
    <CountryPicker bind:value={primaryDestinationCountry} />
  </div>

  <!-- Schengen dates: shown only for non-Schengen destinations -->
  {#if primaryDestinationCountry && !destinationIsSchengen}
    <div class="space-y-2 rounded border border-dashed p-3">
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-sm"
          >Left Schengen
          <input
            type="date"
            class="mt-1 w-full rounded border px-2 py-1"
            bind:value={schengenExitDate}
            oninput={() => (schengenDatesTouched = true)}
          />
        </label>
        <label class="block text-sm"
          >Re-entered Schengen
          <input
            type="date"
            class="mt-1 w-full rounded border px-2 py-1"
            bind:value={schengenReturnDate}
            oninput={() => (schengenDatesTouched = true)}
          />
        </label>
      </div>
      <p class="text-xs text-neutral-500">
        Use these if you transited through another Schengen country before leaving, or re-entered
        Schengen before returning to Portugal. Otherwise leave them as-is.
      </p>
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-sm"
          >Exit Schengen at
          <input
            class="mt-1 w-full rounded border px-2 py-1"
            bind:value={schengenExitLocation}
            placeholder="e.g. MAD airport"
          />
        </label>
        <label class="block text-sm"
          >Re-entered Schengen at
          <input
            class="mt-1 w-full rounded border px-2 py-1"
            bind:value={schengenReturnLocation}
            placeholder="e.g. FCO airport"
          />
        </label>
      </div>
    </div>
  {/if}

  <!-- Other countries visited -->
  <div class="text-sm">
    <div class="mb-1">Other countries visited <span class="text-neutral-400">(optional)</span></div>
    <CountriesMultiPicker bind:value={otherCountriesVisited} />
    <p class="mt-1 text-xs text-neutral-500">
      For your own travel diary. Doesn't change the calculation.
    </p>
  </div>

  <!-- Purposes -->
  <div class="text-sm">
    <div class="mb-1">Purposes <span class="text-neutral-400">(optional)</span></div>
    <div class="flex flex-wrap gap-1">
      {#each allPurposes as p (p.id)}
        <button
          class="rounded-full border px-2 py-1 text-xs {purposes.includes(p.id)
            ? 'bg-black text-white'
            : ''}"
          onclick={() => togglePurpose(p.id)}>{p.label}</button
        >
      {/each}
    </div>
    <p class="mt-1 text-xs text-neutral-500">
      Some purposes may justify extended absences under Article 85 of Lei n.º 23/2007 — particularly
      <strong>business</strong>, <strong>work</strong>, <strong>family</strong>, and
      <strong>medical</strong> reasons. Tourism and personal travel are tracked for your own
      records only.
    </p>
  </div>

  <!-- Notes -->
  <label class="block text-sm"
    >Notes
    <textarea class="mt-1 w-full rounded border px-2 py-1" rows="2" bind:value={notes}></textarea>
  </label>

  <!-- Live impact preview -->
  {#if preview}
    <div class="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <div class="mb-1 font-semibold">Impact preview</div>
      Portugal: {preview.before.portugal.interpolated.used} →
      <strong>{preview.after.portugal.interpolated.used}</strong>
      / {preview.after.portugal.interpolated.budgetDays} d<br />
      Schengen: {preview.before.schengen.interpolated.used} →
      <strong>{preview.after.schengen.interpolated.used}</strong>
      / {preview.after.schengen.interpolated.budgetDays} d
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex gap-2">
    <button class="flex-1 rounded bg-black py-2 text-white" onclick={save}>Save</button>
    <button class="flex-1 rounded bg-neutral-200 py-2" onclick={onClose}>Cancel</button>
    {#if initial}<button class="px-3 py-2 text-red-700" onclick={remove}>Delete</button>{/if}
  </div>
</div>
```

- [ ] **Step 2: Autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/trips/TripForm.svelte
```

Resolve any reported issues.

- [ ] **Step 3: Verify check passes**

```bash
npm run check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): rewrite TripForm for v2 schema (B4 layout, multi-purpose, helper text)"
```

---

## Task 8: Update trips list page

**Goal:** Card title is country-only. Multi-country trips display "Visited:" line and "+N" suffix. Filters and badges still work.

**Files:**
- Modify: `src/routes/trips/+page.svelte`

- [ ] **Step 1: Replace `src/routes/trips/+page.svelte`**

Replace contents:

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
      .sort((a, b) => a.portugalExitDate.localeCompare(b.portugalExitDate))
      .filter((t) => {
        if (filter === 'past') return t.status === 'past';
        if (filter === 'planned') return t.status === 'planned';
        if (filter === 'outside') return !isSchengen(t.primaryDestinationCountry);
        return true;
      })
  );

  const tabs: [Filter, string][] = [
    ['all', 'All'],
    ['past', 'Past'],
    ['planned', 'Planned'],
    ['outside', 'Outside Schengen']
  ];

  function isCurrent(t: Trip) {
    return t.portugalExitDate <= today && today < t.portugalReturnDate;
  }
</script>

<header class="mb-4 flex items-center justify-between">
  <h1 class="text-xl font-semibold">Trips</h1>
  <button class="rounded bg-black px-3 py-2 text-white" onclick={() => (creating = true)}
    >+ Add trip</button
  >
</header>

<div class="mb-4 flex gap-2 text-xs">
  {#each tabs as [v, label] (v)}
    <button
      class="rounded-full border px-3 py-1 {filter === v ? 'bg-black text-white' : ''}"
      onclick={() => (filter = v)}>{label}</button
    >
  {/each}
</div>

{#if creating}<TripForm onClose={() => (creating = false)} />{/if}
{#if editing}<TripForm initial={editing} onClose={() => (editing = null)} />{/if}

<ul class="mt-3 space-y-2">
  {#each filtered as t (t.id)}
    {@const current = isCurrent(t)}
    {@const sch = isSchengen(t.primaryDestinationCountry)}
    {@const extra = t.otherCountriesVisited ?? []}
    <li
      class="rounded-xl border p-3 {current
        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
        : ''}"
    >
      <button class="w-full text-left" onclick={() => (editing = t)}>
        <div class="flex justify-between">
          <span class="font-semibold">
            {countryFlag(t.primaryDestinationCountry)}
            {countryName(t.primaryDestinationCountry)}{extra.length > 0
              ? ` +${extra.length}`
              : ''}
          </span>
          <span class="text-sm font-semibold"
            >{daysBetween(t.portugalExitDate, t.portugalReturnDate) - 1} d</span
          >
        </div>
        <div class="text-xs text-neutral-500">
          {t.portugalExitDate} → {t.portugalReturnDate}
        </div>
        {#if extra.length > 0}
          <div class="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            Visited: {extra
              .map((c) => `${countryFlag(c)} ${countryName(c)}`)
              .join(', ')}
          </div>
        {/if}
        <div class="mt-1 flex flex-wrap gap-1 text-xs">
          <span
            class="rounded px-1.5 py-0.5 {sch
              ? 'bg-blue-100 text-blue-900'
              : 'bg-amber-100 text-amber-900'}"
            >{sch ? 'Schengen' : 'Outside Schengen'}</span
          >
          {#each t.purposes ?? [] as p (p)}
            <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">{p}</span>
          {/each}
          {#if t.status === 'planned'}<span
              class="rounded bg-purple-100 px-1.5 py-0.5 text-purple-900">planned</span
            >{/if}
          {#if t.needsReview}<span class="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-900"
              >needs review ⚠️</span
            >{/if}
        </div>
      </button>
    </li>
  {/each}
</ul>
```

- [ ] **Step 2: Autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/trips/+page.svelte
```

Resolve any reported issues.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): trips list — country-only title, Visited line, multi-purpose pills"
```

---

## Task 9: Update simulator route

**Goal:** Uses v2 field names. Two-interval handling is implicit (the engine uses defaults when only Portugal dates are entered, which matches the simulator's "what-if" UX).

**Files:**
- Modify: `src/routes/simulate/+page.svelte`

- [ ] **Step 1: Replace `src/routes/simulate/+page.svelte`**

Replace contents:

```svelte
<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import { isSchengen } from '$lib/domain/countries';
  import CountryPicker from '$lib/components/CountryPicker.svelte';
  import type { Trip } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  const today = todayISO();
  const activeCard = $derived(
    data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate)
  );

  let portugalExitDate = $state('');
  let portugalReturnDate = $state('');
  let primaryDestinationCountry = $state('');

  const draft: Trip = $derived({
    id: '__sim__',
    status: 'planned',
    portugalExitDate,
    portugalReturnDate,
    primaryDestinationCountry
  });

  const result = $derived.by(() => {
    if (
      !activeCard ||
      !portugalExitDate ||
      !portugalReturnDate ||
      !primaryDestinationCountry
    ) {
      return null;
    }
    const before = computeCardCompliance({
      card: activeCard,
      trips: data.trips,
      today,
      settings: data.settings
    });
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
      (result.after.portugal.projectedAfterPlanned.interpolatedUsed >
        result.after.portugal.interpolated.budgetDays ||
        result.after.schengen.projectedAfterPlanned.interpolatedUsed >
          result.after.schengen.interpolated.budgetDays)
  );

  async function saveAsPlanned() {
    if (!primaryDestinationCountry) return;
    const trip: Trip = { ...draft, id: uuid() };
    await data.upsertTrip(trip);
    portugalExitDate = portugalReturnDate = primaryDestinationCountry = '';
  }
</script>

<h1 class="mb-4 text-xl font-semibold">🧮 Simulator</h1>

{#if !activeCard}
  <p class="text-sm">Add an active card first.</p>
{:else}
  <div class="space-y-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
    <div class="grid grid-cols-2 gap-2">
      <label class="block text-sm"
        >Left Portugal
        <input
          type="date"
          class="mt-1 w-full rounded border px-2 py-1"
          bind:value={portugalExitDate}
        />
      </label>
      <label class="block text-sm"
        >Returned to Portugal
        <input
          type="date"
          class="mt-1 w-full rounded border px-2 py-1"
          bind:value={portugalReturnDate}
        />
      </label>
    </div>
    <div class="text-sm">
      <div class="mb-1">Primary destination country</div>
      <CountryPicker bind:value={primaryDestinationCountry} />
    </div>
    {#if primaryDestinationCountry}
      <div class="text-xs">
        {isSchengen(primaryDestinationCountry)
          ? 'Inside Schengen — counts toward Portugal only'
          : 'Outside Schengen — counts toward both Portugal and Schengen'}
      </div>
    {/if}
  </div>

  {#if result}
    <div class="mt-4 space-y-2 rounded-xl border bg-white p-4 text-sm dark:bg-neutral-900">
      <h2 class="font-semibold">Impact</h2>
      <div class="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-2">
        <span class="text-xs text-neutral-500">Portugal</span>
        <span>{result.before.portugal.projectedAfterPlanned.interpolatedUsed}</span>
        <span class="text-neutral-400">→</span>
        <strong>{result.after.portugal.projectedAfterPlanned.interpolatedUsed}</strong>
        <span class="text-xs text-neutral-500">Schengen</span>
        <span>{result.before.schengen.projectedAfterPlanned.interpolatedUsed}</span>
        <span class="text-neutral-400">→</span>
        <strong>{result.after.schengen.projectedAfterPlanned.interpolatedUsed}</strong>
      </div>
      <div
        class="rounded p-3 {overLimit
          ? 'border border-red-200 bg-red-50 text-red-800'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800'}"
      >
        {overLimit
          ? '⚠️ This trip would exceed your interpolated absence budget.'
          : '✅ Within all limits.'}
      </div>
      <button class="w-full rounded bg-black py-2 text-white" onclick={saveAsPlanned}
        >Save as planned trip</button
      >
    </div>
  {/if}
{/if}
```

- [ ] **Step 2: Autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/routes/simulate/+page.svelte
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): simulator uses v2 field names"
```

---

## Task 10: Update Timeline component + verify dashboard

**Goal:** Timeline reads `portugalExitDate`/`portugalReturnDate` instead of v1 names. Dashboard page itself does not reference Trip fields directly (it reads from `compliance` results), so no changes needed there.

**Files:**
- Modify: `src/lib/components/Timeline.svelte`

- [ ] **Step 1: Update `src/lib/components/Timeline.svelte`**

Replace contents:

```svelte
<script lang="ts">
  import { differenceInCalendarDays, parseISO } from 'date-fns';
  import type { Card, Trip, ISODate } from '$lib/domain/types';

  let { card, trips, today }: { card: Card; trips: Trip[]; today: ISODate } = $props();

  const total = $derived(
    differenceInCalendarDays(parseISO(card.expiryDate), parseISO(card.issuedDate)) + 1
  );

  function pct(date: ISODate): number {
    const days = differenceInCalendarDays(parseISO(date), parseISO(card.issuedDate));
    return Math.max(0, Math.min(100, (days / total) * 100));
  }
</script>

<div class="rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <h3 class="mb-2 text-sm font-semibold">Card timeline</h3>
  <div class="relative h-7 rounded bg-neutral-100 dark:bg-neutral-800">
    {#each trips as t (t.id)}
      {@const left = pct(t.portugalExitDate)}
      {@const width = Math.max(0.5, pct(t.portugalReturnDate) - left)}
      <div
        class="absolute top-1 h-5 rounded-sm {t.status === 'past'
          ? 'bg-blue-600'
          : 'border border-dashed border-blue-700 bg-blue-300'}"
        style="left: {left}%; width: {width}%"
        title="{t.portugalExitDate} → {t.portugalReturnDate}"
      ></div>
    {/each}
    <div class="absolute -top-0.5 -bottom-0.5 w-0.5 bg-red-500" style="left: {pct(today)}%"></div>
  </div>
  <div class="mt-2 flex justify-between text-[10px] text-neutral-500">
    <span>{card.issuedDate}</span>
    <span>today</span>
    <span>{card.expiryDate}</span>
  </div>
</div>
```

- [ ] **Step 2: Autofixer**

```bash
npx @sveltejs/mcp svelte-autofixer ./src/lib/components/Timeline.svelte
```

- [ ] **Step 3: Verify build, check, and lint all clean**

```bash
npm run check
npm run lint
npm run build
```

All three must be green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(ui): Timeline reads portugalExit/Return fields"
```

---

## Task 11: E2E — update existing test + add Madrid-transit case

**Goal:** Golden-path E2E uses new field labels. Add a second E2E asserting the Madrid-transit case produces distinct Portugal and Schengen numbers.

**Files:**
- Modify: `e2e/golden-path.spec.ts`
- Create: `e2e/madrid-transit.spec.ts`

- [ ] **Step 1: Update `e2e/golden-path.spec.ts`**

Replace contents:

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
  await page.getByLabel('Left Portugal').fill('2025-11-04');
  await page.getByLabel('Returned to Portugal').fill('2025-11-12');
  await page.getByRole('button', { name: 'Pick a country' }).click();
  await page.getByPlaceholder('Search countries…').fill('United Kingdom');
  await page.getByRole('button', { name: /United Kingdom/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('🇬🇧')).toBeVisible();

  // Dashboard shows the absence numbers.
  await page.goto('/');
  await expect(page.getByText('Portugal absence')).toBeVisible();
  await expect(page.getByText('Schengen absence')).toBeVisible();
  await expect(page.getByText('/ 244 days').first()).toBeVisible();
});
```

- [ ] **Step 2: Create `e2e/madrid-transit.spec.ts`**

Create:

```ts
import { test, expect } from '@playwright/test';

test('Madrid-transit trip produces distinct Portugal and Schengen absence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();

  // Card
  await page.goto('/cards/');
  await page.getByRole('button', { name: '+ Add card' }).click();
  await page.getByLabel('Label').fill('2nd card');
  await page.getByLabel('Permit type').selectOption('subsequent_3yr');
  await page.getByLabel('Issued').fill('2025-08-01');
  await page.getByLabel('Expiry').fill('2028-01-31');
  await page.getByRole('button', { name: 'Save' }).click();

  // Add the Madrid-transit trip:
  //   PT exit Mon 2026-05-04, transited via Madrid one day,
  //   Schengen exit Tue 2026-05-05 → Istanbul → back via Madrid → PT return Sun 2026-05-17
  await page.goto('/trips/');
  await page.getByRole('button', { name: '+ Add trip' }).click();
  await page.getByLabel('Left Portugal').fill('2026-05-04');
  await page.getByLabel('Returned to Portugal').fill('2026-05-17');
  await page.getByRole('button', { name: 'Pick a country' }).click();
  await page.getByPlaceholder('Search countries…').fill('Türkiye');
  await page.getByRole('button', { name: /Türkiye/ }).click();

  // Now the Schengen-date pair is visible. Override the exit date.
  await page.getByLabel('Left Schengen').fill('2026-05-05');
  await page.getByLabel('Re-entered Schengen').fill('2026-05-17');

  await page.getByRole('button', { name: 'Save' }).click();

  // Dashboard should show 13 Portugal absence days and 12 Schengen.
  await page.goto('/');
  // Use the tiles' "X / 244 days" pattern. The Portugal tile shows 13, Schengen shows 12.
  await expect(page.locator('text=/Portugal absence/i')).toBeVisible();
  await expect(page.locator('text=/Schengen absence/i')).toBeVisible();
  // Look up the bold "used" number within each tile by scoping to nearby text.
  const portugalTile = page.locator('div', { hasText: 'Portugal absence' }).first();
  await expect(portugalTile.getByText('13', { exact: true })).toBeVisible();
  const schengenTile = page.locator('div', { hasText: 'Schengen absence' }).first();
  await expect(schengenTile.getByText('12', { exact: true })).toBeVisible();
});
```

- [ ] **Step 3: Build and run E2E**

```bash
npm run build
npm run test:e2e -- --project=chromium
```

Expected: both specs pass (2 tests). If the Madrid-transit test fails because the locator selector for the destination "Türkiye" doesn't find the country in the list, check the country list in `src/lib/domain/countries.ts` — the row should be `{ code: 'TR', name: 'Türkiye', flag: '🇹🇷', isSchengen: false }`. If the country search field needs different terminology, update the test to use the correct name.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(e2e): update golden-path labels and add Madrid-transit spec"
```

---

## Task 12: Final verification + README + spec cross-link

**Goal:** All four CI gates green. README mentions v1.1. Spec is committed (already committed in pre-task setup).

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the full test gauntlet**

```bash
npm run lint
npm run check
npm run test
npm run test:e2e -- --project=chromium
```

All four must pass. If anything fails, fix and re-run before continuing.

- [ ] **Step 2: Update `README.md`**

Replace the "Spec & plan" section with:

```markdown
## Spec & plan

### v1 — initial implementation (2026-05-11)
- [Design spec](docs/superpowers/specs/2026-05-10-portugal-residence-tracker-design.md)
- [Implementation plan](docs/superpowers/plans/2026-05-10-portugal-residence-tracker.md)

### v1.1 — Trip model redesign (2026-05-12)
- [Redesign spec](docs/superpowers/specs/2026-05-12-trip-model-redesign-design.md)
- [Redesign plan](docs/superpowers/plans/2026-05-12-trip-model-redesign.md)

v1.1 introduces two-interval absences (Portugal + Schengen), multi-country trips,
multi-select purposes, and a simpler form. Existing v1 data migrates losslessly.
```

- [ ] **Step 3: Run prettier**

```bash
npm run format
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "docs: README cross-links v1.1 spec and plan"
```

- [ ] **Step 5: Show the commit log to confirm tidy history**

```bash
git log --oneline | head -15
```

Expected: 12 new commits on top of v1 (one per task), each focused and conventional-commit-formatted.

- [ ] **Step 6: Push to remote**

```bash
git push origin main
```

Confirm the push succeeds and the new commits appear at https://github.com/khaledmos/portugal-residence-tracker

---

## Self-review (post-plan)

**Spec coverage check:**

- ✅ §2 Legal model (two intervals) — Tasks 1, 2 (engine refactor + tests)
- ✅ §3 Goals (two-interval, multi-country, non-flight, simpler form, multi-purpose, migration) — Tasks 1–11 collectively
- ✅ §4.1 Trip v2 schema — Task 1 step 1
- ✅ §4.2 Removed fields migrated — Task 3 (migration tests cover city/airport → notes, purpose → purposes[])
- ✅ §4.3 Added fields — Task 1 (type), Task 7 (form), Task 8 (list display)
- ✅ §4.4 Schema version 2 — Task 4
- ✅ §5.1 Portugal scope unchanged — Task 1 (verified by existing tests still passing)
- ✅ §5.2 Schengen scope effective interval — Task 1 (selector) + Task 2 (tests)
- ✅ §5.3 Currently-abroad per-scope — Task 1 (compliance.ts loop uses intervalOf) + Task 2 (Madrid-transit-currently test)
- ✅ §5.4 clipTrip dual-interval — Task 1 (impl + 2 new tests)
- ✅ §5.5 Invariants — Task 2 (Schengen ≤ Portugal implicit; Schengen-only zero contribution; otherCountriesVisited ignored)
- ✅ §6.1 Form layout with helper text verbatim — Task 7
- ✅ §6.2 Trip list — Task 8
- ✅ §6.3 Country picker / multi-picker — Tasks 6 (multi) + 7 (used)
- ✅ §6.4 Dashboard — Task 10 (no markup change needed; verified Timeline updated)
- ✅ §7.1 Dexie upgrade in place — Task 4
- ✅ §7.2 JSON import migration — Task 5
- ✅ §7.3 Export v2 — Task 5 (SCHEMA_VERSION reused from schema.ts which became 2 in Task 4)
- ✅ §8.1 Unit tests — Tasks 1, 2, 3, 4, 5
- ✅ §8.2 E2E — Task 11
- ✅ §10 Definition of done — Task 12

**Placeholder scan:** None. Every step has actual code or actual commands.

**Type consistency:** `Trip` schema in Task 1 step 1 defines exactly the fields referenced in Tasks 2 (compliance tests), 3 (migration), 4 (Dexie indexes), 5 (importFromJSON), 7 (TripForm bindings), 8 (trips list), 9 (simulator), 10 (Timeline). `IntervalSelector` type in Task 1 step 4 (`absence.ts`) is consumed in Task 1 step 6 (`compliance.ts`). `migrateV1TripToV2` signature in Task 3 step 3 matches its callers in Task 4 step 1 (Dexie upgrader) and Task 5 step 3 (backup.ts).
