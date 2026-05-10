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
