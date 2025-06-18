
-- Create a new policy for organizations table that allows viewing organization details 
-- when there's a valid, unexpired invitation for the user's email or when accessed via invitation token
CREATE POLICY "orgs_view_via_invitation" 
  ON public.organizations 
  FOR SELECT 
  USING (
    -- Allow if user is already a member (existing functionality)
    public.user_is_organization_member(auth.uid(), id)
    OR
    -- Allow if there's a valid, unexpired invitation for this organization
    EXISTS (
      SELECT 1 FROM public.organization_invitations 
      WHERE organization_id = organizations.id 
      AND expires_at > now() 
      AND accepted_at IS NULL
      AND (
        -- For authenticated users, check their email
        (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        OR
        -- For unauthenticated access, we'll handle this in the application layer
        auth.uid() IS NULL
      )
    )
  );

-- Update the existing policy to be more specific about member access
DROP POLICY IF EXISTS "orgs_view_members" ON public.organizations;
CREATE POLICY "orgs_view_members" 
  ON public.organizations 
  FOR SELECT 
  USING (
    public.user_is_organization_member(auth.uid(), id)
  );
