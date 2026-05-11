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

describe('computeCardCompliance — two-interval Schengen', () => {
  it('uses explicit Schengen dates when both are set (Madrid-transit case)', () => {
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
