
export interface Organization {
  id: string;
  name: string;
  address?: string;
  urn?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrganizationGroup {
  id: string;
  name: string;
  type: 'MAT' | 'federation' | 'local_authority';
  created_at: string;
  updated_at?: string;
}

export interface OrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  is_primary?: boolean;
  created_at: string;
}

export interface OrganizationWithRole extends Organization {
  role: OrganizationRole;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  organization_id: string;
  role: OrganizationRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export type OrganizationRole = 'admin' | 'editor' | 'viewer';

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  is_primary?: boolean;
  created_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    job_title?: string;
  };
}
