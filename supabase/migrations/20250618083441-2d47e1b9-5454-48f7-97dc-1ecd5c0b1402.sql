
-- Add explicit INSERT policy for organization admins to send invitations
CREATE POLICY "org_invitations_admin_insert" 
  ON public.organization_invitations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
      AND organization_id = organization_invitations.organization_id 
      AND role = 'admin'
    )
  );
