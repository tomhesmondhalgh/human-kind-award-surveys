import { supabase } from '@/integrations/supabase/client';

// National benchmarks: real figures from get_national_benchmarks() once enough
// schools have taken part, otherwise these illustrative figures, which the UI
// must label as illustrative.

export const ILLUSTRATIVE_RECOMMENDATION_AVERAGE = 7.8;

export const ILLUSTRATIVE_AGREEMENT_SPLIT: Record<string, number> = {
  "Strongly Agree": 0.25,
  "Agree": 0.40,
  "Disagree": 0.25,
  "Strongly Disagree": 0.10,
};

export const ILLUSTRATIVE_LEAVING_SPLIT: Record<string, number> = {
  "Never": 0.25,
  "Rarely": 0.25,
  "Sometimes": 0.40,
  "Often": 0.10,
  "All the Time": 0,
};

// survey_responses columns for the eight agreement questions, in the order
// the Analysis page lists them.
export const WELLBEING_FIELDS = [
  'valued_member',
  'leadership_prioritize',
  'manageable_workload',
  'work_life_balance',
  'health_state',
  'support_access',
  'confidence_in_role',
  'org_pride',
] as const;

export type WellbeingField = typeof WELLBEING_FIELDS[number];

export interface NationalBenchmarks {
  total_responses: number;
  organisation_count: number;
  recommendation_average: number;
  questions: Record<WellbeingField, Record<string, number>>;
  leaving_contemplation: Record<string, number>;
}

const isSplit = (value: unknown): value is Record<string, number> =>
  !!value && typeof value === 'object' &&
  Object.values(value as object).every((v) => typeof v === 'number' && Number.isFinite(v));

// Accepts the function's result only if every figure is present, so the page
// never mixes real and illustrative numbers under one label.
export function parseNationalBenchmarks(raw: unknown): NationalBenchmarks | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const questions = b.questions as Record<string, unknown> | null | undefined;
  const average = Number(b.recommendation_average);
  if (
    b.recommendation_average == null || !Number.isFinite(average) ||
    !questions || !WELLBEING_FIELDS.every((f) => isSplit(questions[f])) ||
    !isSplit(b.leaving_contemplation)
  ) {
    return null;
  }
  return {
    total_responses: Number(b.total_responses) || 0,
    organisation_count: Number(b.organisation_count) || 0,
    recommendation_average: average,
    questions: questions as NationalBenchmarks['questions'],
    leaving_contemplation: b.leaving_contemplation as Record<string, number>,
  };
}

const CACHE_MS = 60 * 60 * 1000;
let cached: { at: number; value: Promise<NationalBenchmarks | null> } | null = null;

// Cached for an hour: the figures move slowly and every chart asks for them.
// Errors resolve to null (illustrative figures) rather than breaking the page.
export function fetchNationalBenchmarks(): Promise<NationalBenchmarks | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const value = (async () => {
    const { data, error } = await supabase.rpc('get_national_benchmarks');
    if (error) {
      console.error('Error fetching national benchmarks:', error);
      cached = null;
      return null;
    }
    return parseNationalBenchmarks(data);
  })();
  cached = { at: Date.now(), value };
  return value;
}

export function nationalRecommendationAverage(benchmarks: NationalBenchmarks | null): number {
  return benchmarks?.recommendation_average ?? ILLUSTRATIVE_RECOMMENDATION_AVERAGE;
}

export function nationalAgreementSplit(benchmarks: NationalBenchmarks | null, field: string): Record<string, number> {
  const real = benchmarks?.questions[field as WellbeingField];
  return { ...(real ?? ILLUSTRATIVE_AGREEMENT_SPLIT) };
}

export function nationalLeavingSplit(benchmarks: NationalBenchmarks | null): Record<string, number> {
  return { ...(benchmarks?.leaving_contemplation ?? ILLUSTRATIVE_LEAVING_SPLIT) };
}

export function benchmarkLabel(benchmarks: NationalBenchmarks | null): string {
  return benchmarks ? 'National average' : 'Illustrative average';
}

export function benchmarkNote(benchmarks: NationalBenchmarks | null): string {
  return benchmarks
    ? `National average from ${benchmarks.total_responses.toLocaleString('en-GB')} responses across ${benchmarks.organisation_count.toLocaleString('en-GB')} schools.`
    : 'Illustrative figures, not real national data. Real national averages will appear once enough schools have taken part.';
}

// Test hook: forget the cached result.
export function resetNationalBenchmarksCache() {
  cached = null;
}
