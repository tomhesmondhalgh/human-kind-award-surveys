import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildAnalysisDateRange } from '@/utils/analysisDateRange';

describe('buildAnalysisDateRange', () => {
  it('has no bounds for all time', () => {
    expect(buildAnalysisDateRange('all-time')).toEqual({});
  });

  it('starts at local midnight 30 / 90 days ago', () => {
    const now = new Date(2026, 8, 27, 15, 30);
    expect(new Date(buildAnalysisDateRange('last-30-days', {}, now).startDate!)).toEqual(new Date(2026, 7, 28, 0, 0, 0, 0));
    expect(new Date(buildAnalysisDateRange('last-90-days', {}, now).startDate!)).toEqual(new Date(2026, 5, 29, 0, 0, 0, 0));
    expect(buildAnalysisDateRange('last-30-days', {}, now).endDate).toBeUndefined();
  });

  it('covers the whole of the chosen start and end days in local time', () => {
    const range = buildAnalysisDateRange('custom-range', {
      from: new Date(2026, 5, 1, 14, 0),
      to: new Date(2026, 5, 30, 9, 0),
    });
    expect(new Date(range.startDate!)).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
    expect(new Date(range.endDate!)).toEqual(new Date(2026, 5, 30, 23, 59, 59, 999));
  });

  it('allows an open-ended custom range', () => {
    expect(buildAnalysisDateRange('custom-range', { from: new Date(2026, 0, 1) }).endDate).toBeUndefined();
    expect(buildAnalysisDateRange('custom-range', {})).toEqual({});
  });

  describe('in the UK during British Summer Time', () => {
    const originalTz = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = 'Europe/London';
    });
    afterAll(() => {
      process.env.TZ = originalTz;
    });

    it('does not shift the range by a day', () => {
      const range = buildAnalysisDateRange('custom-range', {
        from: new Date(2026, 5, 1),
        to: new Date(2026, 5, 30),
      });
      expect(range.startDate).toBe('2026-05-31T23:00:00.000Z');
      expect(range.endDate).toBe('2026-06-30T22:59:59.999Z');
      // A response at 11pm BST on the last day is included.
      expect('2026-06-30T22:00:00.000Z' <= range.endDate!).toBe(true);
    });
  });
});
