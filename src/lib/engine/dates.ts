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
