import { describe, it, expect } from 'vitest';
import {
  getCloseDateDisplay,
  isCloseDateOnOrAfterStart,
  toEndOfLocalDay,
} from '@/utils/survey/closeDate';
import { surveyFormSchema } from '@/components/surveys/surveyFormSchema';

describe('toEndOfLocalDay', () => {
  it('moves a picked date to the last millisecond of that local day', () => {
    const end = toEndOfLocalDay(new Date(2026, 9, 10));
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(10);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it('keeps a survey closing on the 10th open all day on the 10th', () => {
    const close = toEndOfLocalDay(new Date(2026, 9, 10));
    expect(new Date(2026, 9, 10, 18, 0) < close).toBe(true);
    expect(new Date(2026, 9, 11, 0, 0) > close).toBe(true);
  });
});

describe('isCloseDateOnOrAfterStart', () => {
  it('allows the same day regardless of time', () => {
    expect(isCloseDateOnOrAfterStart(new Date(2026, 9, 10, 15), new Date(2026, 9, 10, 0))).toBe(true);
  });
  it('rejects a close date before the start date', () => {
    expect(isCloseDateOnOrAfterStart(new Date(2026, 9, 10), new Date(2026, 9, 9))).toBe(false);
  });
});

describe('surveyFormSchema', () => {
  const base = { name: 'Autumn survey', date: new Date(2026, 9, 10), distributionMethod: 'link' as const };

  it('accepts a survey without a close date', () => {
    expect(surveyFormSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a close date on the start day', () => {
    expect(surveyFormSchema.safeParse({ ...base, closeDate: new Date(2026, 9, 10) }).success).toBe(true);
  });

  it('rejects a close date before the start date with an error on closeDate', () => {
    const result = surveyFormSchema.safeParse({ ...base, closeDate: new Date(2026, 9, 1) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['closeDate']);
    }
  });

  it('rejects an empty name', () => {
    expect(surveyFormSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
  });
});

describe('getCloseDateDisplay', () => {
  const now = new Date(2026, 9, 10, 9, 0);

  it('says "Closes today" for a survey closing at the end of today', () => {
    const close = toEndOfLocalDay(new Date(2026, 9, 10)).toISOString();
    expect(getCloseDateDisplay(close, now).text).toBe('Closes today');
  });

  it('counts calendar days, not 24-hour blocks', () => {
    const close = toEndOfLocalDay(new Date(2026, 9, 11)).toISOString();
    expect(getCloseDateDisplay(close, now).text).toBe('Closes 11/10/2026 (1 day)');
  });

  it('shows closed once the close time has passed', () => {
    const close = toEndOfLocalDay(new Date(2026, 9, 9)).toISOString();
    expect(getCloseDateDisplay(close, now).text).toBe('Closed 09/10/2026');
  });

  it('handles a missing close date', () => {
    expect(getCloseDateDisplay(undefined, now).text).toBe('No close date');
  });
});
