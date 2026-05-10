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
