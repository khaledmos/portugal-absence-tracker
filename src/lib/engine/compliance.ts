import { addMonths, format, parseISO } from 'date-fns';
import type { Card, Settings, Trip, ISODate } from '../domain/types';
import { isSchengen } from '../domain/countries';
import { permitRules } from '../domain/permit-rules';
import { clipTrip, daysBetween } from './dates';
import { interpolatedAbsence, longestConsecutiveStreak } from './absence';

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
    portugal: scopeFor(past, planned, settings, todayDate, rule, false),
    schengen: scopeFor(past, planned, settings, todayDate, rule, true)
  };
}

function scopeFor(
  past: Trip[],
  planned: Trip[],
  settings: Settings,
  today: Date,
  rule: ReturnType<typeof permitRules>,
  outsideSchengenOnly: boolean
): ScopeCompliance {
  const filter = (t: Trip) =>
    outsideSchengenOnly ? !isSchengen(t.destinationCountry) : t.destinationCountry !== 'PT';
  const pastInScope = past.filter(filter);
  const plannedInScope = planned.filter(filter);

  const interpolatedUsed = interpolatedAbsence(pastInScope, settings.daycountConvention);
  const consecutiveUsed = longestConsecutiveStreak(pastInScope, settings.daycountConvention);

  let currentlyAbroad = false;
  let currentStreakDays: number | undefined;
  let limitDate: ISODate | undefined;
  for (const trip of pastInScope) {
    const dep = parseISO(trip.departureDate);
    const ret = parseISO(trip.returnDate);
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

  const projectedTrips = [...pastInScope, ...plannedInScope];
  const projectedInterpolated = interpolatedAbsence(projectedTrips, settings.daycountConvention);
  const projectedConsecutive = longestConsecutiveStreak(
    projectedTrips,
    settings.daycountConvention
  );

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
