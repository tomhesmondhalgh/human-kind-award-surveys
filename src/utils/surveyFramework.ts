import { ACTION_PLAN_SECTIONS } from '../types/actionPlan';

// Links each of the eight agree/disagree survey questions to the Human Kind
// framework section it measures. `texts` are the wordings the question appears
// under (respondent form and analysis charts) so a chart can find its section
// from its title.
export const FRAMEWORK_QUESTION_MAP = [
  {
    field: 'leadership_prioritize',
    sectionKey: 'leadership',
    texts: ['Leadership prioritise staff wellbeing in our organisation', 'Leadership prioritises staff wellbeing'],
  },
  {
    field: 'manageable_workload',
    sectionKey: 'workload',
    texts: ['I have a manageable workload', 'My workload is manageable'],
  },
  {
    field: 'work_life_balance',
    sectionKey: 'life-work-balance',
    texts: ['I have a good work-life balance'],
  },
  {
    field: 'health_state',
    sectionKey: 'health',
    texts: ['I am in good physical and mental health'],
  },
  {
    field: 'valued_member',
    sectionKey: 'connection',
    texts: ['I feel like a valued member of the team', 'I feel valued as a member of this organisation'],
  },
  {
    field: 'support_access',
    sectionKey: 'support',
    texts: ['I have access to support when I need it', 'I can access support when I need it'],
  },
  {
    field: 'confidence_in_role',
    sectionKey: 'growth',
    texts: ['I feel confident performing my role and am given chances to grow', 'I feel confident in my role'],
  },
  {
    field: 'org_pride',
    sectionKey: 'values',
    texts: ['I am proud to be part of this organisation', 'I am proud to work for this organisation'],
  },
] as const;

export type FrameworkQuestionField = (typeof FRAMEWORK_QUESTION_MAP)[number]['field'];

export const FRAMEWORK_QUESTION_FIELDS = FRAMEWORK_QUESTION_MAP.map((q) => q.field);


const normalise = (text: string) => text.toLowerCase().replace(/[^a-z]+/g, ' ').trim();

export function sectionForQuestionText(text: string): string | undefined {
  const target = normalise(text);
  return FRAMEWORK_QUESTION_MAP.find((q) => q.texts.some((t) => normalise(t) === target))?.sectionKey;
}

export type SurveyAnswerRow = Partial<Record<FrameworkQuestionField, string | null>>;

// % of people who answered the question with Agree or Strongly Agree; null if
// nobody answered it.
export function agreementPercent(rows: SurveyAnswerRow[], field: FrameworkQuestionField): number | null {
  let answered = 0;
  let agreed = 0;
  for (const row of rows) {
    const answer = row[field];
    if (!answer) continue;
    answered++;
    if (answer === 'Agree' || answer === 'Strongly Agree') agreed++;
  }
  return answered === 0 ? null : Math.round((agreed / answered) * 100);
}

export interface SectionScore {
  sectionKey: string;
  title: string;
  score: number | null;
}

export function computeSectionScores(rows: SurveyAnswerRow[]): SectionScore[] {
  return ACTION_PLAN_SECTIONS.map((section) => {
    const question = FRAMEWORK_QUESTION_MAP.find((q) => q.sectionKey === section.key);
    return {
      sectionKey: section.key,
      title: section.title,
      score: question ? agreementPercent(rows, question.field) : null,
    };
  });
}

// The two lowest-scoring sections, plus a third if it's within
// `closeMargin` points of the second. Ties keep framework order.
export function pickFocusAreas(scores: SectionScore[], closeMargin = 5): string[] {
  const ranked = scores
    .filter((s): s is SectionScore & { score: number } => s.score !== null)
    .map((s, index) => ({ ...s, index }))
    .sort((a, b) => a.score - b.score || a.index - b.index);
  const picked = ranked.slice(0, 2);
  const third = ranked[2];
  if (third && picked.length === 2 && third.score - picked[1].score <= closeMargin) picked.push(third);
  return picked.map((s) => s.sectionKey);
}
