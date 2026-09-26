
export interface SurveyFormData {
  role: string;
  leadership_prioritize: string;
  manageable_workload: string;
  work_life_balance: string;
  health_state: string;
  valued_member: string;
  support_access: string;
  confidence_in_role: string;
  org_pride: string;
  recommendation_score: string;
  leaving_contemplation: string;
  doing_well: string;
  improvements: string;
  custom_responses: Record<string, string>;
}

export interface CustomQuestionType {
  id: string;
  text: string;
  type: string;
  options?: string[];
}
