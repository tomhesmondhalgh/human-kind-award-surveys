import { describe, it, expect } from 'vitest';
import { REQUIRED_FIELD_MESSAGES, getRequiredProgress, getValidationErrors } from '@/components/survey-form/validation';
import type { SurveyFormData } from '@/types/surveyForm';

const empty: SurveyFormData = {
  role: '', leadership_prioritize: '', manageable_workload: '', work_life_balance: '', health_state: '',
  valued_member: '', support_access: '', confidence_in_role: '', org_pride: '', recommendation_score: '',
  leaving_contemplation: '', doing_well: '', improvements: '', custom_responses: {},
};

const complete: SurveyFormData = {
  ...empty,
  role: 'Teacher / Trainer', leadership_prioritize: 'Agree', manageable_workload: 'Disagree',
  work_life_balance: 'Agree', health_state: 'Agree', valued_member: 'Strongly Agree', support_access: 'Agree',
  confidence_in_role: 'Agree', org_pride: 'Agree', recommendation_score: '0', leaving_contemplation: 'Never',
};

const questions = [
  { id: 'q1', text: 'How do you get to work?', type: 'text' },
  { id: 'q2', text: '  ', type: 'text' },
];

describe('survey form validation', () => {
  it('lists every required standard question when nothing is answered', () => {
    const errors = getValidationErrors(empty);
    expect(errors).toEqual(Object.values(REQUIRED_FIELD_MESSAGES));
    expect(errors).toHaveLength(11);
  });

  it('treats the two free-text questions as optional and 0 as a valid score', () => {
    expect(getValidationErrors(complete)).toEqual([]);
  });

  it('names each unanswered custom question, ignoring whitespace-only answers', () => {
    const errors = getValidationErrors({ ...complete, custom_responses: { q2: '   ' } }, questions);
    expect(errors).toEqual(['Please answer "How do you get to work?"', 'Please answer all additional questions']);
    expect(getValidationErrors({ ...complete, custom_responses: { q1: 'Bike', q2: 'x' } }, questions)).toEqual([]);
  });

  it('counts answered required questions for the progress bar', () => {
    expect(getRequiredProgress(empty, questions)).toEqual({ answered: 0, total: 13 });
    expect(getRequiredProgress({ ...complete, doing_well: 'lots', custom_responses: { q1: 'Bike' } }, questions))
      .toEqual({ answered: 12, total: 13 });
  });
});
