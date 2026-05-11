import { addMonths, addYears, format, parseISO } from 'date-fns';
import type { Card, DaycountConvention, Settings, Trip, ISODate } from '../domain/types';
import { isSchengen } from '../domain/countries';
import { permitRules } from '../domain/permit-rules';
import { clipTrip, daysBetween } from './dates';
import { interpolatedAbsence, longestConsecutiveStreak, type IntervalSelector } from './absence';

export type ScopeCompliance = {
  consecutive: {
    used: number;
    budgetMonths: number;
    limitDate?: ISODate;
    currentlyAbroad: boolean;
    currentStreakDays?: number;
  };
  interpolated: {
    used: number;
    budgetDays: number;
    budgetMonthsLabel: string;
  };
  projectedAfterPlanned: {
    consecutiveUsed: number;
    interpolatedUsed: number;
  };
};

export type CardCompliance = {
  cardId: string;
  validityDays: number;
  elapsedDays: number;
  portugal: ScopeCompliance;
  schengen: ScopeCompliance;
};

const portugalInterval: IntervalSelector = (t) => [t.portugalExitDate, t.portugalReturnDate];

const schengenInterval: IntervalSelector = (t) => {
  if (isSchengen(t.primaryDestinationCountry)) return null;
  const exit = t.schengenExitDate ?? t.portugalExitDate;
  const ret = t.schengenReturnDate ?? t.portugalReturnDate;
  return [exit, ret];
};

export function computeCardCompliance(input: {
  card: Card;
  trips: Trip[];
  today: ISODate;
  settings: Settings;
}): CardCompliance {
  const { card, trips, today, settings } = input;
  const rule = permitRules(card.type);

  const validityDays = daysBetween(card.issuedDate, card.expiryDate);
  const todayDate = parseISO(today);
  const expiry = parseISO(card.expiryDate);
  const elapsedClampedEnd = todayDate.getTime() < expiry.getTime() ? todayDate : expiry;
  const elapsedDays = Math.max(
    0,
    daysBetween(card.issuedDate, format(elapsedClampedEnd, 'yyyy-MM-dd'))
  );

  const clipped = trips
    .map((t) => clipTrip(t, card.issuedDate, card.expiryDate))
    .filter((t): t is Trip => t !== null);

  const past = clipped.filter((t) => t.status === 'past');
  const planned = clipped.filter((t) => t.status === 'planned');

  return {
    cardId: card.id,
    validityDays,
    elapsedDays,
    portugal: scopeFor(past, planned, settings, todayDate, rule, portugalInterval),
    schengen: scopeFor(past, planned, settings, todayDate, rule, schengenInterval)
  };
}

function scopeFor(
  past: Trip[],
  planned: Trip[],
  settings: Settings,
  today: Date,
  rule: ReturnType<typeof permitRules>,
  intervalOf: IntervalSelector
): ScopeCompliance {
  const conv = settings.daycountConvention;

  const interpolatedUsed =
    rule.windowYears > 0
      ? maxInterpolatedInSlidingWindow(past, conv, rule.windowYears, intervalOf)
      : interpolatedAbsence(past, conv, intervalOf);
  const consecutiveUsed = longestConsecutiveStreak(past, conv, intervalOf);

  let currentlyAbroad = false;
  let currentStreakDays: number | undefined;
  let limitDate: ISODate | undefined;
  for (const trip of past) {
    const interval = intervalOf(trip);
    if (!interval) continue;
    const dep = parseISO(interval[0]);
    const ret = parseISO(interval[1]);
    if (dep.getTime() <= today.getTime() && today.getTime() < ret.getTime()) {
      currentlyAbroad = true;
      currentStreakDays = Math.max(
        1,
        Math.floor((today.getTime() - dep.getTime()) / 86_400_000) + 1
      );
      limitDate = format(addMonths(dep, rule.consecutiveMonths), 'yyyy-MM-dd');
      break;
    }
  }

  const projectedTrips = [...past, ...planned];
  const projectedInterpolated =
    rule.windowYears > 0
      ? maxInterpolatedInSlidingWindow(projectedTrips, conv, rule.windowYears, intervalOf)
      : interpolatedAbsence(projectedTrips, conv, intervalOf);
  const projectedConsecutive = longestConsecutiveStreak(projectedTrips, conv, intervalOf);

  return {
    consecutive: {
      used: consecutiveUsed,
      budgetMonths: rule.consecutiveMonths,
      currentlyAbroad,
      currentStreakDays,
      limitDate
    },
    interpolated: {
      used: interpolatedUsed,
      budgetDays: rule.interpolatedDays,
      budgetMonthsLabel: rule.interpolatedLabel
    },
    projectedAfterPlanned: {
      consecutiveUsed: projectedConsecutive,
      interpolatedUsed: projectedInterpolated
    }
  };
}

function maxInterpolatedInSlidingWindow(
  trips: Trip[],
  convention: DaycountConvention,
  windowYears: number,
  intervalOf: IntervalSelector
): number {
  if (trips.length === 0) return 0;
  // Candidate window starts: each trip's Portugal exit date (the broader interval).
  const starts = trips.map((t) => t.portugalExitDate);
  let best = 0;
  for (const start of starts) {
    const end = format(addYears(parseISO(start), windowYears), 'yyyy-MM-dd');
    const clipped = trips.map((t) => clipTrip(t, start, end)).filter((t): t is Trip => t !== null);
    const value = interpolatedAbsence(clipped, convention, intervalOf);
    if (value > best) best = value;
  }
  return best;
}
