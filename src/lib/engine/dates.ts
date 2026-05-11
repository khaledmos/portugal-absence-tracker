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
