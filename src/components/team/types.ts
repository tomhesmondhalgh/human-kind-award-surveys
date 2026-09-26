
/**
 * Basic type definitions for team members
 */
export interface TeamMember {
  id: string;
  userId: string;
  email?: string;
  name?: string;
  organizationId: string;
  role: string;
  isPrimary: boolean;
  createdAt: string;
}
