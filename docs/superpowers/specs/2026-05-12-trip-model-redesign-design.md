# Trip Model Redesign — Design Spec (v1.1)

**Date:** 2026-05-12
**Predecessor:** [2026-05-10-portugal-residence-tracker-design.md](2026-05-10-portugal-residence-tracker-design.md)
**Type:** Iteration on shipped v1

## 1. Context

v1 shipped on 2026-05-11 (commit `ff6f14d`, 21 commits, 45 unit tests, 1 E2E passing, deployed to `khaledmos/portugal-absence-tracker` private repo). The user tested v1 with real travel scenarios and surfaced four model gaps that materially affect what the absence calculator can express.

The gaps are not bugs in the code — the calculator does what its inputs say. The gaps are in the inputs themselves: the v1 `Trip` schema assumes "one departure, one destination, one return" and treats Portugal absence and Schengen absence as the same interval. Real trips routinely break both assumptions.

This spec defines a v2 `Trip` schema, the form changes that go with it, the calculation-engine adjustments, and the migration path for existing v1 data.

## 2. The legal model, made explicit

Article 85.2 of Lei n.º 23/2007 counts **two distinct absence intervals**:

| Counter | Starts when… | Ends when… |
|---|---|---|
| **Portugal absence** | The user leaves Portugal | The user re-enters Portugal |
| **Schengen absence** | The user crosses out of the Schengen Area (any external border) | The user crosses back into Schengen |

For a direct LIS → Istanbul → LIS round-trip, both intervals coincide. For LIS → Madrid (transit, Tue) → Istanbul (Wed) → Cairo → Marrakesh → LIS (Mon), the intervals diverge: Portugal absence is Tue→Mon, Schengen absence is Wed→Mon (the Madrid transit is a Portugal absence but not a Schengen absence).

The v1 schema cannot express the Wed/Tue split — it has only one pair of dates and one destination country. The redesign fixes this.

## 3. Goals and non-goals

**Goals**
- Express two distinct absence intervals (Portugal + Schengen) per trip
- Support trips that visit multiple non-Schengen countries
- Support trips by any transport (train, bus, car, ferry) — not just flights
- Simplify the form: no required city, no required airport codes, fewer fields the user has to look at
- Multi-select purposes with helper text linking them to Article 85
- Migrate existing v1 trips losslessly to the v2 schema

**Non-goals (deferred)**
- Auto-detection from emails/tickets — still V2, still deferred
- Multi-leg trips that exit and re-enter Schengen more than once in one absence (user can record those as two separate trips; the bridging logic already unions them correctly)
- Transport-mode field — explicitly dropped per user feedback ("focus on country level and dates")

## 4. Data model

### 4.1 Updated `Trip`

```ts
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

  // Required: Portugal absence interval (always present).
  portugalExitDate: ISODate;
  portugalReturnDate: ISODate;

  // Optional: Schengen absence sub-interval.
  // If primaryDestinationCountry is Schengen → these MUST be undefined.
  // If primaryDestinationCountry is non-Schengen and these are undefined → engine defaults them to the Portugal dates.
  // If user explicitly fills them → engine uses them (this supports the Madrid-transit case).
  schengenExitDate?: ISODate;
  schengenReturnDate?: ISODate;

  // Required: primary destination (drives title and Schengen detection).
  primaryDestinationCountry: string; // ISO 3166-1 alpha-2

  // Optional: other non-Schengen or Schengen countries visited during the trip.
  // Diary-only. Calculation engine ignores this field entirely.
  otherCountriesVisited?: string[];

  // Optional: where the user crossed the Schengen external border.
  // Free text. Only meaningful for non-Schengen trips. Transport-agnostic ("MAD", "Madrid airport", "Tarifa ferry").
  schengenExitLocation?: string;
  schengenReturnLocation?: string;

  // Optional: multi-select purpose list.
  purposes?: TripPurpose[];

  notes?: string;
};
```

### 4.2 What was removed

| v1 field | Fate |
|---|---|
| `departureDate` | Renamed → `portugalExitDate` |
| `returnDate` | Renamed → `portugalReturnDate` |
| `destinationCountry` | Renamed → `primaryDestinationCountry` |
| `destinationCity` | **Removed.** Migrated into `notes` (prefixed `"City: <value>. "`) |
| `departureAirport` | **Removed.** Migrated into `notes` if present, prefixed `"From: <value>. "` |
| `arrivalAirport` | **Removed.** Migrated into `notes` if present, prefixed `"To: <value>. "` |
| `purpose` (single) | Migrated → `purposes: [purpose]` (single-element array) |

### 4.3 What was added

- `schengenExitDate`, `schengenReturnDate` (optional)
- `otherCountriesVisited: string[]` (optional)
- `schengenExitLocation`, `schengenReturnLocation` (optional, free text)
- `purposes: TripPurpose[]` (multi-select; replaces single `purpose`)
- New purpose value: `tourism` (replaces `social` and `cultural` from v1)

### 4.4 Schema version

`SCHEMA_VERSION` bumps from `1` to `2`. The migration is one-way (v1 JSON exports can be imported and upgraded; v2 cannot be exported as v1).

## 5. Calculation engine

The engine is currently a pure function over `Trip[]`. The redesign keeps it pure and adjusts only how each trip contributes to each scope.

### 5.1 Portugal scope (interpolated + consecutive)

For every trip, the Portugal contribution is the absent days in `[portugalExitDate, portugalReturnDate)` (standard convention) or the equivalent under the user's chosen day-counting convention. **Unchanged from v1** except for the field rename.

### 5.2 Schengen scope (interpolated + consecutive)

For every trip, the Schengen contribution is computed using **effective Schengen exit/return dates**:

```
function effectiveSchengenInterval(trip):
  if isSchengen(trip.primaryDestinationCountry):
    return null   // no Schengen absence for this trip
  if trip.schengenExitDate && trip.schengenReturnDate:
    return [trip.schengenExitDate, trip.schengenReturnDate]
  // non-Schengen destination, no explicit dates → fall back to Portugal interval
  return [trip.portugalExitDate, trip.portugalReturnDate]
```

The interpolated/consecutive helpers then run over those intervals.

### 5.3 Currently-abroad detection

Two flavors:
- **`portugal.currentlyAbroad`** = today is in any trip's `[portugalExitDate, portugalReturnDate)` interval
- **`schengen.currentlyAbroad`** = today is in any trip's effective Schengen interval

The "limit date" (when consecutive limit is breached) uses the relevant interval's start: for the Portugal counter, `addMonths(portugalExitDate, budgetMonths)`; for Schengen, `addMonths(schengenExitDate, budgetMonths)`.

### 5.4 `clipTrip`

Now clips both intervals to the card validity window. If the Portugal interval is fully outside the window, the trip is dropped (returns `null`). If the Schengen interval is partially outside, it is clipped — the Portugal interval may still contribute.

### 5.5 Calculation invariants (tested)

- Schengen absence ≤ Portugal absence (always — Schengen exits are sub-intervals of Portugal exits)
- For a trip with `primaryDestinationCountry` in Schengen, Schengen absence contribution is exactly 0 regardless of `otherCountriesVisited`
- `otherCountriesVisited` does not appear in any calculation output

## 6. UI

### 6.1 Trip form

Layout (top to bottom):

1. **Status toggle** — Past / Planned. Unchanged from v1.

2. **Dates section.** Two pairs:
   - "Left Portugal" / "Returned to Portugal" — **always shown, required**
   - "Left Schengen" / "Re-entered Schengen" — **shown only when primary destination is non-Schengen**

   The Schengen pair auto-mirrors the Portugal pair on first entry (`schengenExitDate = portugalExitDate`, `schengenReturnDate = portugalReturnDate`). The user can edit either date independently to express the Madrid-transit case.

   **Helper text under the Schengen pair:**
   > *Use these if you transited through another Schengen country before leaving, or re-entered Schengen before returning to Portugal. Otherwise leave them as-is.*

3. **Primary destination country** — required CountryPicker. Drives:
   - Whether the Schengen date pair is shown
   - The trip card title

4. **Other countries visited** — optional collapsible. Multi-select via CountryPicker. UI shows a "+ Add another country" affordance. When collapsed (empty), takes one line.

   **Helper text:**
   > *Optional. For your own travel diary. Doesn't change the calculation.*

5. **Exit Schengen at** / **Re-entered Schengen at** — optional free-text inputs. **Shown only when primary destination is non-Schengen.** Labels are transport-agnostic; placeholder text suggests examples ("e.g. MAD airport, Tarifa ferry, Vilar Formoso border").

6. **Purposes** — multi-select pills. Options: Business · Work · Personal · Tourism · Family · Medical · Other.

   **Helper text:**
   > *Some purposes may justify extended absences under Article 85 of Lei n.º 23/2007 — particularly **business**, **work**, **family**, and **medical** reasons. Tourism and personal travel are tracked for your own records only.*

7. **Notes** — unchanged.

8. **Impact preview** — unchanged in spirit; shows Portugal and Schengen before/after numbers using the new effective intervals.

9. **Save / Cancel / (Delete)** — unchanged.

### 6.2 Trip list (cards)

Each card now displays:

- **Title:** `🇹🇷 Turkey` (country flag + name; no city). If `otherCountriesVisited` is non-empty, append `+N` (e.g., `🇹🇷 Turkey +2`).
- **Date line:** `2026-09-02 → 2026-09-13 · 11 d` (Portugal absence days).
- **Secondary line** (only if `otherCountriesVisited` is non-empty): `Visited: 🇪🇬 Egypt, 🇲🇦 Morocco`.
- **Badges** (existing visual style):
  - `Schengen` / `Outside Schengen` (Schengen badge if destination is Schengen, "Outside Schengen" if non-Schengen)
  - One pill per purpose (`business`, `medical`, …)
  - `planned` if status is planned
  - `needs review` if `needsReview` flag set

Filters in the trips route remain: All / Past / Planned / Outside Schengen.

### 6.3 Country picker

Unchanged component. Used in three places now: primary destination (single), other countries (multi), and (unchanged) the simulator route.

For "other countries visited" multi-select: the picker is rendered once per country added, with an "+ Add another country" button below to add another picker row. Each row has a small "×" to remove.

### 6.4 Dashboard

The dashboard's two tiles (Portugal absence / Schengen absence) and the "currently abroad" banner all read from the same `computeCardCompliance` result. No changes to the dashboard markup needed beyond ensuring the new effective Schengen interval is what the engine returns.

## 7. Migration

### 7.1 In-place IndexedDB migration (Dexie version bump)

Dexie schema bumps to version 2. The migration upgrades every existing `Trip` row:

```ts
// Pseudocode for the upgrader inside TrackerDB
this.version(2).stores({ /* same as v1 */ }).upgrade((tx) => {
  return tx.table('trips').toCollection().modify((t: any) => {
    // Rename fields
    t.portugalExitDate = t.departureDate;
    t.portugalReturnDate = t.returnDate;
    t.primaryDestinationCountry = t.destinationCountry;
    delete t.departureDate;
    delete t.returnDate;
    delete t.destinationCountry;

    // Migrate purpose → purposes
    if (t.purpose) {
      // Map any deprecated values (cultural, social → tourism)
      const purposeMap = { cultural: 'tourism', social: 'tourism' };
      const p = purposeMap[t.purpose] ?? t.purpose;
      t.purposes = [p];
      delete t.purpose;
    }

    // Migrate city/airports to notes
    const noteFragments = [];
    if (t.destinationCity) noteFragments.push(`City: ${t.destinationCity}`);
    if (t.departureAirport) noteFragments.push(`From: ${t.departureAirport}`);
    if (t.arrivalAirport) noteFragments.push(`To: ${t.arrivalAirport}`);
    if (noteFragments.length > 0) {
      t.notes = [noteFragments.join('. ') + '.', t.notes].filter(Boolean).join(' ');
    }
    delete t.destinationCity;
    delete t.departureAirport;
    delete t.arrivalAirport;
  });
});
```

### 7.2 JSON import migration

The backup module's `importFromJSON` already validates `schemaVersion`. The new logic: if the imported envelope has `schemaVersion === 1`, run the same field-level migration before writing rows. If `schemaVersion === 2`, write as-is. Anything else → throw.

### 7.3 Export

Always exports as v2. `SCHEMA_VERSION` constant becomes `2`.

## 8. Testing

### 8.1 Unit tests (new + updated)

- `permit-rules` tests — unchanged, no schema dependency
- `dates.test.ts` — `clipTrip` now operates on `portugalExitDate/portugalReturnDate`; the existing tests rename inputs
- `absence.test.ts` — same; rename field references in fixtures
- `compliance.test.ts` — every test renames fields. Plus **new tests** for:
  - Trip with destination = Spain (Schengen) → Portugal absence non-zero, Schengen absence = 0
  - Trip with destination = Turkey, no explicit Schengen dates → both intervals equal
  - Trip with destination = Turkey, explicit Schengen dates differing from Portugal dates → Schengen absence < Portugal absence (the Madrid-transit case)
  - Trip with `otherCountriesVisited` populated → calculation identical to same trip with empty array
  - Currently-abroad: both Portugal and Schengen flags computed correctly when today falls in different intervals (the user is in Madrid en route to Istanbul → currently abroad from Portugal but not from Schengen)
- New test file: `migration.test.ts` exercising the Dexie v1 → v2 upgrade path against `fake-indexeddb`
- `backup.test.ts` — add a case importing a v1 JSON payload and asserting it upgrades correctly

### 8.2 E2E

`e2e/golden-path.spec.ts` — relabel the form selectors:
- "Departure" → "Left Portugal"
- "Return" → "Returned to Portugal"
- The single purpose select interaction → multi-select pill click
- Add a second test for the Madrid-transit case: enter different Portugal vs Schengen dates, assert the dashboard shows distinct Portugal and Schengen absence numbers

## 9. Open questions

None. All design choices locked in during brainstorm.

## 10. Definition of "v1.1 done"

- Schema migrated, all existing v1 trips upgrade cleanly with no data loss
- All 45 v1 unit tests still pass after field renames + migration
- New tests for two-interval calculation and migration all pass
- E2E golden path + Madrid-transit E2E both green
- Form follows B4 layout with exact helper text from this spec
- Trip card title uses primary country only; multi-country trips show "Visited: …"
- Purpose helper text references Article 85 with the legally-relevant purposes called out
- `npm run lint`, `npm run check`, `npm run test`, `npm run test:e2e` all green
- One conventional commit per logical change in the implementation plan
- README and spec docs updated to reflect v1.1
