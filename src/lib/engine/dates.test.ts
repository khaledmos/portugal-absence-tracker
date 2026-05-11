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
