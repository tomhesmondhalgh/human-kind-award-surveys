-- Fix RLS policies for organization_invitations and action_plan_submissions

-- ============================================================================
-- Fix organization_invitations RLS policies
-- ============================================================================
-- Issue: Current SELECT policy only allows users to view invitations sent to their email
-- or if they can manage the org. This prevents organization members from viewing
-- all pending invitations for their organization.

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "org_invitations_view_own_email" ON organization_invitations;

-- Create a new policy that allows organization members to view all invitations
-- for their organization (not just ones sent to them)
CREATE POLICY "org_invitations_view_org_members"
ON organization_invitations
FOR SELECT
USING (
  -- Allow if user is a member of the organization
  user_is_organization_member(auth.uid(), organization_id)
  OR
  -- Also allow if the invitation is for the user's email (for accepting invitations)
  (
    auth.uid() IS NOT NULL 
    AND email = (
      SELECT users.email 
      FROM auth.users 
      WHERE users.id = auth.uid()
    )
  )
);

-- ============================================================================
-- Verify action_plan_submissions RLS policies
-- ============================================================================
-- The existing policies look correct, but let's ensure they're properly set up
-- The 406 error might be due to missing Accept header or format issues

-- Recreate the SELECT policy to ensure it's working correctly
DROP POLICY IF EXISTS "aps_view_org_members" ON action_plan_submissions;

CREATE POLICY "aps_view_org_members"
ON action_plan_submissions
FOR SELECT
USING (
  user_is_organization_member(auth.uid(), organization_id)
);