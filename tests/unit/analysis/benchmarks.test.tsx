import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSupabase = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));

import {
  ILLUSTRATIVE_AGREEMENT_SPLIT,
  ILLUSTRATIVE_RECOMMENDATION_AVERAGE,
  WELLBEING_FIELDS,
  fetchNationalBenchmarks,
  nationalAgreementSplit,
  nationalRecommendationAverage,
  parseNationalBenchmarks,
  resetNationalBenchmarksCache,
} from '@/utils/benchmarks';
import RecommendationScoreSection from '@/components/analysis/RecommendationScoreSection';

const split = { 'Strongly Agree': 0.3, 'Agree': 0.5, 'Disagree': 0.15, 'Strongly Disagree': 0.05 };
const realResult = {
  total_responses: 1234,
  organisation_count: 12,
  recommendation_average: 6.9,
  questions: Object.fromEntries(WELLBEING_FIELDS.map((f) => [f, split])),
  leaving_contemplation: { 'Never': 0.3, 'Rarely': 0.3, 'Sometimes': 0.2, 'Often': 0.15, 'All the Time': 0.05 },
};

describe('parseNationalBenchmarks', () => {
  it('accepts a complete result', () => {
    expect(parseNationalBenchmarks(realResult)?.recommendation_average).toBe(6.9);
  });

  it('treats null (not enough schools yet) as no benchmarks', () => {
    expect(parseNationalBenchmarks(null)).toBeNull();
  });

  it('rejects a result with any figure missing, so real and illustrative never mix', () => {
    const missingQuestion = { ...realResult, questions: { ...realResult.questions, org_pride: null } };
    expect(parseNationalBenchmarks(missingQuestion)).toBeNull();
    expect(parseNationalBenchmarks({ ...realResult, recommendation_average: null })).toBeNull();
  });
});

describe('benchmark values', () => {
  it('fall back to the illustrative figures', () => {
    expect(nationalRecommendationAverage(null)).toBe(ILLUSTRATIVE_RECOMMENDATION_AVERAGE);
    expect(nationalAgreementSplit(null, 'valued_member')).toEqual(ILLUSTRATIVE_AGREEMENT_SPLIT);
  });

  it('use the real figures when available', () => {
    const b = parseNationalBenchmarks(realResult);
    expect(nationalRecommendationAverage(b)).toBe(6.9);
    expect(nationalAgreementSplit(b, 'org_pride')).toEqual(split);
  });
});

describe('fetchNationalBenchmarks', () => {
  beforeEach(() => {
    resetNationalBenchmarksCache();
    mockSupabase.rpc.mockReset();
  });

  it('returns null on error instead of throwing', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await fetchNationalBenchmarks()).toBeNull();
  });

  it('caches the result', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: realResult, error: null });
    await fetchNationalBenchmarks();
    await fetchNationalBenchmarks();
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('RecommendationScoreSection labels', () => {
  const renderSection = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RecommendationScoreSection score={7} nationalAverage={7.8} hasAccess />
      </QueryClientProvider>
    );

  beforeEach(() => {
    resetNationalBenchmarksCache();
    mockSupabase.rpc.mockReset();
  });

  it('says "Illustrative average" when there are no real benchmarks yet', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
    renderSection();
    expect(await screen.findByText('Illustrative average')).toBeInTheDocument();
    expect(screen.getByText(/not real national data/)).toBeInTheDocument();
  });

  it('says "National average" with the sample size when real benchmarks exist', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: realResult, error: null });
    renderSection();
    expect(await screen.findByText('National average')).toBeInTheDocument();
    expect(screen.getByText(/1,234 responses across 12 schools/)).toBeInTheDocument();
  });
});
