import { describe, it, expect } from 'vitest';
import { permitRules } from './permit-rules';

describe('permitRules', () => {
  it('returns 6-month / 244-day budgets for initial_2yr', () => {
    const r = permitRules('initial_2yr');
    expect(r.consecutiveMonths).toBe(6);
    expect(r.interpolatedDays).toBe(244);
    expect(r.interpolatedLabel).toBe('8 months (≈244 days)');
    expect(r.windowYears).toBe(0);
  });

  it('returns 6-month / 244-day budgets for subsequent_3yr', () => {
    const r = permitRules('subsequent_3yr');
    expect(r.consecutiveMonths).toBe(6);
    expect(r.interpolatedDays).toBe(244);
  });

  it('returns 24-month / 913-day / 3-year-window for permanent_5yr', () => {
    const r = permitRules('permanent_5yr');
    expect(r.consecutiveMonths).toBe(24);
    expect(r.interpolatedDays).toBe(913);
    expect(r.windowYears).toBe(3);
    expect(r.interpolatedLabel).toBe('30 months (≈913 days) per any 3-year window');
  });
});
