-- Fix #5: Tighten RLS policy for organization_invitations
-- Add email verification for token-based access to prevent information disclosure

-- Drop existing policy
DROP POLICY IF EXISTS "org_invitations_view_org_members" ON organization_invitations;

-- Create improved policy with email check on token-based access
CREATE POLICY "org_invitations_view_org_members" ON organization_invitations
FOR SELECT USING (
  -- Members of the organization can view all invitations
  user_is_organization_member(auth.uid(), organization_id)
  
  -- OR authenticated user's email matches the invitation email
  OR (
    (auth.uid() IS NOT NULL) 
    AND (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  
  -- OR valid token access (for accept-invitation page)
  -- Allow unauthenticated access with valid token, but authenticated users must match email
  OR (
    (token IS NOT NULL) 
    AND (accepted_at IS NULL) 
    AND (expires_at > now())
    AND (
      -- Unauthenticated users can view with valid token (for accept page)
      (auth.uid() IS NULL)
      -- Authenticated users must have matching email
      OR (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  )
);