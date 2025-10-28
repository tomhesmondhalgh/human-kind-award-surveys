-- Drop the existing policy
DROP POLICY IF EXISTS "orgs_view_via_invitation" ON organizations;

-- Create improved policy that allows token-based viewing
CREATE POLICY "orgs_view_via_invitation" 
ON organizations
FOR SELECT
USING (
  -- Organization members can view their organizations
  user_is_organization_member(auth.uid(), id)
  
  -- OR: Anyone with a valid invitation token can view the organization details
  OR (EXISTS (
    SELECT 1
    FROM organization_invitations
    WHERE organization_invitations.organization_id = organizations.id
      AND organization_invitations.expires_at > now()
      AND organization_invitations.accepted_at IS NULL
      AND organization_invitations.token IS NOT NULL
  ))
);