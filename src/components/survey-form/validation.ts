import { CustomQuestionType, SurveyFormData } from '../../types/surveyForm';

type StandardField = Exclude<keyof SurveyFormData, 'custom_responses'>;

// The required standard questions and the message shown when one is missing.
// StandardQuestions looks messages up here, so the inline highlight always
// matches the summary list. doing_well and improvements are optional.
export const REQUIRED_FIELD_MESSAGES: Partial<Record<StandardField, string>> = {
  role: 'Role is required',
  leadership_prioritize: 'Leadership prioritisation rating is required',
  manageable_workload: 'Workload rating is required',
  work_life_balance: 'Work-life balance rating is required',
  health_state: 'Health state rating is required',
  valued_member: 'Team value rating is required',
  support_access: 'Support access rating is required',
  confidence_in_role: 'Role confidence rating is required',
  org_pride: 'Organisation pride rating is required',
  recommendation_score: 'Recommendation score is required',
  leaving_contemplation: 'Leaving contemplation response is required',
};

const REQUIRED_FIELDS = Object.keys(REQUIRED_FIELD_MESSAGES) as StandardField[];

export function customQuestionMessage(question: Pick<CustomQuestionType, 'text'>): string {
  const text = question.text?.trim();
  return text ? `Please answer "${text}"` : 'Please answer all additional questions';
}

const isAnswered = (value: string | undefined) => !!value && value.trim() !== '';

// Every custom question is treated as required.
export function getValidationErrors(formData: SurveyFormData, questions: CustomQuestionType[] = []): string[] {
  const errors = REQUIRED_FIELDS
    .filter((field) => !isAnswered(formData[field]))
    .map((field) => REQUIRED_FIELD_MESSAGES[field]!);
  for (const question of questions) {
    if (!isAnswered(formData.custom_responses[question.id])) errors.push(customQuestionMessage(question));
  }
  return errors;
}

export function getRequiredProgress(formData: SurveyFormData, questions: CustomQuestionType[] = []) {
  const total = REQUIRED_FIELDS.length + questions.length;
  const answered =
    REQUIRED_FIELDS.filter((field) => isAnswered(formData[field])).length +
    questions.filter((q) => isAnswered(formData.custom_responses[q.id])).length;
  return { answered, total };
}
