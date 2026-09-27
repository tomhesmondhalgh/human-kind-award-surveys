import { describe, it, expect } from 'vitest';
import { canShowResults, MIN_RESPONSES_TO_SHOW_RESULTS } from '@/lib/anonymity';

describe('anonymity threshold', () => {
  it('is 5 responses', () => {
    expect(MIN_RESPONSES_TO_SHOW_RESULTS).toBe(5);
  });

  it('hides results below the threshold', () => {
    expect(canShowResults(0)).toBe(false);
    expect(canShowResults(4)).toBe(false);
  });

  it('shows results at and above the threshold', () => {
    expect(canShowResults(5)).toBe(true);
    expect(canShowResults(120)).toBe(true);
  });

  it('fails closed on a missing count', () => {
    expect(canShowResults(NaN)).toBe(false);
  });
});
