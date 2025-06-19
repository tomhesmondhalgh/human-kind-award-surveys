
export type AccreditationStatus = 'not_submitted' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface AccreditationSubmission {
  id: string;
  user_id: string;
  submitted_at: string;
  status: AccreditationStatus;
  reviewed_at?: string;
  approved_at?: string;
  next_submission_due?: string;
  reviewer_notes?: string;
  submission_data?: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    school_name?: string;
  };
}

export interface AccreditationReadiness {
  isReady: boolean;
  totalSections: number;
  readySections: number;
  pendingItems: number;
  sectionDetails: Array<{
    key: string;
    title: string;
    isReady: boolean;
    pendingCount: number;
  }>;
}
