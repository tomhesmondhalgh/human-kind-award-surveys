
-- Add SELECT policy for organization admins to view invitations for their organization
CREATE POLICY "org_invitations_admin_select" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
      AND organization_id = organization_invitations.organization_id 
      AND role = 'admin'
    )
  );
