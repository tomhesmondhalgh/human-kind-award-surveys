import { describe, it, expect, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

import { buildAnalysisEmailReport, sendReportByEmail } from '@/utils/reportUtils';
import { summariseLeavingContemplation } from '@/utils/analysisUtils';

const input = {
  summary: { introduction: '', strengths: [], improvements: [], unavailable: true },
  recommendationScore: { score: 7, nationalAverage: 7.8 },
  leavingContemplation: summariseLeavingContemplation(['All the Time', 'All the Time', 'Never']),
  detailedResponses: [{
    question: 'Q',
    schoolResponses: { 'Strongly Agree': 0.5, Agree: 0.5, Disagree: 0, 'Strongly Disagree': 0 },
    nationalResponses: { 'Strongly Agree': 0.25, Agree: 0.4, Disagree: 0.25, 'Strongly Disagree': 0.1 },
  }],
};

describe('analysis email report', () => {
  it('sends counts for all five leaving answers and whole percentages', () => {
    const report = buildAnalysisEmailReport(input);
    expect(report.leavingData).toEqual([
      { name: 'Never', value: 1 },
      { name: 'Rarely', value: 0 },
      { name: 'Sometimes', value: 0 },
      { name: 'Often', value: 0 },
      { name: 'All the Time', value: 2 },
    ]);
    expect(report.detailedResponses[0].schoolResponses.Agree).toBe(50);
    expect(report.summary).toBeNull();
  });

  it('refuses to send below the anonymity threshold', async () => {
    await expect(sendReportByEmail('a@b.com', 's1', 4, input)).rejects.toThrow(/at least 5/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('sends at the threshold', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    await sendReportByEmail('a@b.com', 's1', 5, input);
    expect(invoke).toHaveBeenCalledWith('send-analysis-email', expect.objectContaining({
      body: expect.objectContaining({ to: 'a@b.com', surveyId: 's1' }),
    }));
  });
});
