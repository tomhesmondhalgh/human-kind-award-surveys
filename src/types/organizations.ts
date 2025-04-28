
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
}

export interface OrganizationWithRole extends Organization {
  role: string;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_primary?: boolean;
  created_at: string;
}
