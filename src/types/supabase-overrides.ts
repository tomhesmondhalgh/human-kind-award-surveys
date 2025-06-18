
// Application-specific type overrides for Supabase entities
export interface OrganizationData {
  id: string;
  name: string;
  address?: string;
  urn?: string;
  created_at: string;
  updated_at?: string;
  role?: string;
}

export interface OrganizationMembershipData {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_primary?: boolean;
  created_at: string;
}

export interface ProfileData {
  id: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  school_name?: string;
  school_address?: string;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  payment_method?: string;
  stripe_subscription_id?: string;
  start_date?: string;
  end_date?: string;
  purchase_type: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistoryData {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  invoice_number?: string;
  billing_school_name?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_address?: string;
  created_at: string;
  plan_type?: string;
  purchase_type?: string;
}

export interface CustomQuestionData {
  id: string;
  text: string;
  type: string;
  options?: string[] | null;
  created_at: string;
  archived?: boolean;
  creator_id: string;
  organization_id?: string | null;
}

export interface SurveyQuestionData {
  id: string;
  survey_id: string;
  question_id: string;
  created_at: string;
}

export interface OrganizationInvitationData {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}
