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
