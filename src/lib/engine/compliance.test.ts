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
      trips: [
        trip({ departureDate: '2025-11-04', returnDate: '2025-11-12', destinationCountry: 'GB' })
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
        trip({ departureDate: '2025-09-12', returnDate: '2025-09-15', destinationCountry: 'ES' })
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
        trip({ departureDate: '2025-07-25', returnDate: '2025-08-05', destinationCountry: 'GB' })
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
        trip({ departureDate: '2026-05-04', returnDate: '2026-05-14', destinationCountry: 'GB' })
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
          departureDate: '2025-11-04',
          returnDate: '2025-11-12',
          destinationCountry: 'GB',
          status: 'past'
        }),
        trip({
          departureDate: '2026-09-02',
          returnDate: '2026-09-13',
          destinationCountry: 'TR',
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
      departureDate: '2027-01-01',
      returnDate: '2029-08-08',
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

  it('reports a smaller interpolated count when the trips are spread over 5 years (sliding window finds the worst 3yr)', () => {
    const t1: Trip = {
      id: 't1',
      departureDate: '2025-02-01',
      returnDate: '2026-09-25',
      destinationCountry: 'GB',
      status: 'past'
    };
    const t2: Trip = {
      id: 't2',
      departureDate: '2027-09-26',
      returnDate: '2029-05-19',
      destinationCountry: 'GB',
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
