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
