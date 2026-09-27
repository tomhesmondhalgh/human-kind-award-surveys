import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

import {
  getSurveySummary,
  hasEnoughResponsesForSummary,
  buildSummaryRequestBody,
  MIN_RESPONSES_FOR_SUMMARY,
} from '@/utils/summaryUtils';
import { summariseLeavingContemplation, type DetailedQuestionResponse } from '@/utils/analysisUtils';

const leaving = summariseLeavingContemplation(['Never', 'All the Time', 'All the Time', 'Often']);
const detailed: DetailedQuestionResponse[] = [{
  question: 'My workload is manageable',
  schoolResponses: { 'Strongly Agree': 0.5, Agree: 0.25, Disagree: 0.25, 'Strongly Disagree': 0 },
  nationalResponses: { 'Strongly Agree': 0.25, Agree: 0.4, Disagree: 0.25, 'Strongly Disagree': 0.1 },
}];
const text = { doingWell: [], improvements: [] };
const rec = { score: 7, nationalAverage: 7.8 };

describe('AI summary gate', () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('needs at least 10 real responses', () => {
    expect(MIN_RESPONSES_FOR_SUMMARY).toBe(10);
    expect(hasEnoughResponsesForSummary(1)).toBe(false);
    expect(hasEnoughResponsesForSummary(9)).toBe(false);
    expect(hasEnoughResponsesForSummary(10)).toBe(true);
  });

  it('does not call the summary function below the minimum, whatever the proportions say', async () => {
    // One response gives proportions summing to 1.0, which the old check read as 100 responses.
    const result = await getSurveySummary(1, rec, leaving, detailed, text);
    expect(result.insufficientData).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('calls the summary function at the minimum and returns its findings', async () => {
    invoke.mockResolvedValue({ data: { strengths: ['a', 'b', 'c', 'd'], improvements: ['x'] }, error: null });
    const result = await getSurveySummary(10, rec, leaving, detailed, text);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.strengths).toEqual(['a', 'b', 'c']);
    expect(result.improvements).toEqual(['x']);
    expect(result.unavailable).toBeFalsy();
  });

  it('reports "unavailable" rather than inventing findings when the function errors', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('down') });
    const result = await getSurveySummary(25, rec, leaving, detailed, text);
    expect(result.unavailable).toBe(true);
    expect(result.strengths).toEqual([]);
    expect(result.improvements).toEqual([]);
  });

  it('reports "unavailable" when the call throws', async () => {
    invoke.mockRejectedValue(new Error('network'));
    const result = await getSurveySummary(25, rec, leaving, detailed, text);
    expect(result.unavailable).toBe(true);
    expect(result.strengths).toEqual([]);
  });
});

describe('buildSummaryRequestBody', () => {
  it('sends whole percentages, the real count and all five leaving answers', () => {
    const body = buildSummaryRequestBody(12, rec, leaving, detailed, text);
    expect(body.responseCount).toBe(12);
    expect(body.detailedResponses[0].schoolResponses).toEqual({ 'Strongly Agree': 50, Agree: 25, Disagree: 25, 'Strongly Disagree': 0 });
    expect(body.leavingContemplation['All the Time']).toBe('50% (2 of 4)');
    expect(Object.keys(body.leavingContemplation)).toEqual(['Never', 'Rarely', 'Sometimes', 'Often', 'All the Time']);
  });
});
