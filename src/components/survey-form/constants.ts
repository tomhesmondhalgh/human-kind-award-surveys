
// Define options for different question types
export const roleOptions = [
  'Senior Leader', 
  'Middle or Team Leader', 
  'Teacher / Trainer', 
  'Teaching Assistant', 
  'Support Staff', 
  'Governor', 
  'Other', 
  'Prefer Not to Say'
];

export const agreementOptions = [
  'Strongly disagree',
  'Disagree',
  'Agree',
  'Strongly agree'
];

export const frequencyOptions = [
  'Never',
  'Rarely',
  'Sometimes',
  'Often',
  'All the Time'
];

export const initialFormData = {
  role: '',
  leadershipPrioritize: '',
  manageableWorkload: '',
  workLifeBalance: '',
  healthState: '',
  valuedMember: '',
  supportAccess: '',
  confidenceInRole: '',
  orgPride: '',
  recommendationScore: '',
  leavingContemplation: '',
  doingWell: '',
  improvements: ''
};

export type SurveyFormData = typeof initialFormData;
