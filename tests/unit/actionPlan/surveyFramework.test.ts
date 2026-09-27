import { describe, it, expect, vi } from 'vitest';
import { ACTION_PLAN_SECTIONS } from '@/types/actionPlan';
import {
  FRAMEWORK_QUESTION_MAP,
  agreementPercent,
  computeSectionScores,
  pickFocusAreas,
  sectionForQuestionText,
  type SectionScore,
} from '@/utils/surveyFramework';

const responses = vi.hoisted(() => ({ bySurvey: {} as Record<string, unknown[]> }));
vi.mock('@/integrations/supabase/client', () => {
  const surveys = [
    { id: 's-new', name: 'Autumn', date: '2026-09-01T00:00:00Z' },
    { id: 's-old', name: 'Summer', date: '2026-06-01T00:00:00Z' },
  ];
  const from = (table: string) => {
    let surveyId = '';
    const q: any = {
      select: () => q,
      lte: () => q,
      order: () => q,
      limit: () => q,
      eq: (col: string, val: string) => { if (col === 'survey_template_id') surveyId = val; return q; },
      then: (resolve: any) => resolve(
        table === 'survey_templates'
          ? { data: surveys, error: null }
          : { data: responses.bySurvey[surveyId] ?? [], error: null },
      ),
    };
    return q;
  };
  return { supabase: { from } };
});

import { fetchSectionSurveyScores } from '@/hooks/useSectionSurveyScores';

describe('framework question mapping', () => {
  it('maps the eight questions one-to-one onto the eight framework sections', () => {
    const sectionKeys = FRAMEWORK_QUESTION_MAP.map((q) => q.sectionKey).sort();
    expect(sectionKeys).toEqual(ACTION_PLAN_SECTIONS.map((s) => s.key).sort());
    expect(new Set(FRAMEWORK_QUESTION_MAP.map((q) => q.field)).size).toBe(8);
  });

  it('finds the section for both the form wording and the analysis chart wording', () => {
    expect(sectionForQuestionText('I Have A Manageable Workload')).toBe('workload');
    expect(sectionForQuestionText('My workload is manageable')).toBe('workload');
    expect(sectionForQuestionText('I feel valued as a member of this organisation')).toBe('connection');
    expect(sectionForQuestionText('I feel confident in my role')).toBe('growth');
    expect(sectionForQuestionText('Something else')).toBeUndefined();
  });
});

describe('agreementPercent', () => {
  it('counts Agree and Strongly Agree over people who answered', () => {
    const rows = [
      { health_state: 'Agree' }, { health_state: 'Strongly Agree' }, { health_state: 'Disagree' },
      { health_state: null }, {},
    ];
    expect(agreementPercent(rows, 'health_state')).toBe(67);
    expect(agreementPercent([{}], 'health_state')).toBeNull();
  });

  it('gives every section a null score when there are no answers', () => {
    expect(computeSectionScores([]).every((s) => s.score === null)).toBe(true);
  });
});

describe('pickFocusAreas', () => {
  const scores = (values: (number | null)[]): SectionScore[] =>
    ACTION_PLAN_SECTIONS.map((s, i) => ({ sectionKey: s.key, title: s.title, score: values[i] }));

  it('picks the two weakest sections', () => {
    expect(pickFocusAreas(scores([80, 20, 30, 90, 90, 90, 90, 90]))).toEqual(['workload', 'life-work-balance']);
  });

  it('adds a third when it is close to the second', () => {
    expect(pickFocusAreas(scores([80, 20, 30, 34, 90, 90, 90, 90]))).toEqual(['workload', 'life-work-balance', 'health']);
  });

  it('ignores sections with no answers and keeps framework order on ties', () => {
    expect(pickFocusAreas(scores([null, 50, 50, 50, 90, 90, 90, 90]))).toEqual(['workload', 'life-work-balance', 'health']);
    expect(pickFocusAreas(scores([null, null, null, null, null, null, null, 10]))).toEqual(['values']);
  });
});

describe('fetchSectionSurveyScores', () => {
  const row = (answer: string) => Object.fromEntries(FRAMEWORK_QUESTION_MAP.map((q) => [q.field, answer]));

  it('skips surveys with fewer than 5 responses and uses the newest eligible one', async () => {
    responses.bySurvey = {
      's-new': [row('Agree'), row('Agree')],
      's-old': [row('Agree'), row('Agree'), row('Disagree'), row('Disagree'), { ...row('Agree'), org_pride: 'Disagree' }],
    };
    const result = await fetchSectionSurveyScores('org-1');
    expect(result?.survey).toMatchObject({ id: 's-old', responseCount: 5 });
    expect(result?.scores.find((s) => s.sectionKey === 'values')?.score).toBe(40);
    expect(result?.focusAreas[0]).toBe('values');
  });

  it('returns null when no survey has enough responses', async () => {
    responses.bySurvey = { 's-new': [row('Agree')] };
    expect(await fetchSectionSurveyScores('org-1')).toBeNull();
  });
});
