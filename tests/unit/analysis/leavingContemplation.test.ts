import { describe, it, expect, vi, beforeEach } from 'vitest';

// A chainable, awaitable stand-in for a Supabase query builder.
const queryResult = vi.hoisted(() => ({ current: { data: [] as unknown[] | null, error: null as unknown } }));
const calls = vi.hoisted(() => ({ gte: [] as unknown[][], lte: [] as unknown[][] }));

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'not']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.gte = vi.fn((...args: unknown[]) => { calls.gte.push(args); return builder; });
  builder.lte = vi.fn((...args: unknown[]) => { calls.lte.push(args); return builder; });
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(queryResult.current).then(resolve, reject);
  return { supabase: { from: vi.fn(() => builder) } };
});

import {
  getLeavingContemplation,
  summariseLeavingContemplation,
  LEAVING_CONTEMPLATION_OPTIONS,
} from '@/utils/analysisUtils';
import { frequencyOptions } from '@/components/survey-form/constants';

const rows = (values: (string | null)[]) => values.map(v => ({ leaving_contemplation: v }));

describe('summariseLeavingContemplation', () => {
  it('uses exactly the five answers the form offers', () => {
    expect(LEAVING_CONTEMPLATION_OPTIONS).toEqual(frequencyOptions);
    expect(LEAVING_CONTEMPLATION_OPTIONS).toContain('All the Time');
  });

  it('counts "All the Time" in the counts and the total', () => {
    const result = summariseLeavingContemplation(['Never', 'Rarely', 'Sometimes', 'Often', 'All the Time']);
    expect(result.total).toBe(5);
    expect(result.counts).toEqual({ Never: 1, Rarely: 1, Sometimes: 1, Often: 1, 'All the Time': 1 });
    expect(result.proportions['All the Time']).toBe(0.2);
  });

  it('works out shares against all answered responses', () => {
    const result = summariseLeavingContemplation(['All the Time', 'All the Time', 'All the Time', 'Never']);
    expect(result.proportions).toEqual({ Never: 0.25, Rarely: 0, Sometimes: 0, Often: 0, 'All the Time': 0.75 });
  });

  it('tolerates case, whitespace and legacy spellings', () => {
    const result = summariseLeavingContemplation([' all the time ', 'Always', 'OFTEN']);
    expect(result.counts['All the Time']).toBe(2);
    expect(result.counts.Often).toBe(1);
    expect(result.total).toBe(3);
  });

  it('ignores blanks and unknown values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = summariseLeavingContemplation([null, '', 'Maybe', 'Never']);
    expect(result.total).toBe(1);
    expect(result.proportions.Never).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('returns zeros when there are no answers', () => {
    const result = summariseLeavingContemplation([]);
    expect(result.total).toBe(0);
    expect(Object.values(result.proportions).every(v => v === 0)).toBe(true);
  });
});

describe('getLeavingContemplation', () => {
  beforeEach(() => {
    calls.gte.length = 0;
    calls.lte.length = 0;
  });

  it('includes "All the Time" answers from the database', async () => {
    queryResult.current = { data: rows(['All the Time', 'Often', 'Never', 'All the Time']), error: null };
    const result = await getLeavingContemplation('survey-1');
    expect(result.total).toBe(4);
    expect(result.counts['All the Time']).toBe(2);
    expect(result.proportions['All the Time']).toBe(0.5);
  });

  it('applies the date range to created_at', async () => {
    queryResult.current = { data: [], error: null };
    await getLeavingContemplation('survey-1', '2026-06-01T00:00:00.000Z', '2026-06-30T23:59:59.999Z');
    expect(calls.gte).toEqual([['created_at', '2026-06-01T00:00:00.000Z']]);
    expect(calls.lte).toEqual([['created_at', '2026-06-30T23:59:59.999Z']]);
  });

  it('returns an empty result on a database error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    queryResult.current = { data: null, error: { message: 'boom' } };
    const result = await getLeavingContemplation('survey-1');
    expect(result.total).toBe(0);
    expect(Object.keys(result.counts)).toEqual(LEAVING_CONTEMPLATION_OPTIONS);
    error.mockRestore();
  });
});
