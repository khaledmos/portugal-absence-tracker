import type { PermitType } from './types';

export type PermitRule = {
  consecutiveMonths: number;
  interpolatedDays: number;
  interpolatedLabel: string;
  /** 0 = full validity period; >0 = sliding window of N years (permanent permit). */
  windowYears: number;
};

export function permitRules(type: PermitType): PermitRule {
  switch (type) {
    case 'initial_2yr':
    case 'subsequent_3yr':
      return {
        consecutiveMonths: 6,
        interpolatedDays: 244,
        interpolatedLabel: '8 months (≈244 days)',
        windowYears: 0
      };
    case 'permanent_5yr':
      return {
        consecutiveMonths: 24,
        interpolatedDays: 913,
        interpolatedLabel: '30 months (≈913 days) per any 3-year window',
        windowYears: 3
      };
  }
}
