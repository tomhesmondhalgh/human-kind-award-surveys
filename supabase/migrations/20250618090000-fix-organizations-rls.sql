
-- Add missing RLS policy for organizations table to allow access when user has admin role
CREATE POLICY "organizations_admin_access" 
  ON public.organizations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
      AND organization_id = organizations.id 
      AND role = 'admin'
    )
  );

-- Also add a policy for general member access to view their own organization
CREATE POLICY "organizations_member_access" 
  ON public.organizations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
      AND organization_id = organizations.id
    )
  );
