-- Drop the existing policy
DROP POLICY IF EXISTS "org_invitations_view_org_members" ON organization_invitations;

-- Create improved policy that allows token-based viewing
CREATE POLICY "org_invitations_view_org_members" 
ON organization_invitations
FOR SELECT
USING (
  -- Organization members can see invitations for their org
  user_is_organization_member(auth.uid(), organization_id)
  
  -- OR: Authenticated users can see invitations sent to their email
  OR (
    (auth.uid() IS NOT NULL) 
    AND (email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
  )
  
  -- OR: Anyone with a valid token can VIEW the invitation (viewing != accepting)
  -- The email match is enforced server-side in the accept-invitation edge function
  OR (
    (token IS NOT NULL) 
    AND (accepted_at IS NULL) 
    AND (expires_at > now())
  )
);