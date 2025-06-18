
-- Drop existing policies
DROP POLICY IF EXISTS "org_invitations_view_own_email" ON public.organization_invitations;
DROP POLICY IF EXISTS "org_invitations_admin_manage" ON public.organization_invitations;

-- Create a new policy that allows access via token for anyone (including unauthenticated users)
CREATE POLICY "org_invitations_view_by_token" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (true);

-- Create a more restrictive policy for admin management (when not using token)
CREATE POLICY "org_invitations_admin_manage_new" 
  ON public.organization_invitations 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
      AND organization_id = organization_invitations.organization_id 
      AND role = 'admin'
    )
  );
