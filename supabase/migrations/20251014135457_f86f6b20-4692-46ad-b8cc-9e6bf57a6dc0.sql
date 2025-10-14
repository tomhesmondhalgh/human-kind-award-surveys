-- Fix email exposure in organization_invitations table
-- Remove unauthenticated access while preserving legitimate use cases

DROP POLICY IF EXISTS "org_invitations_view_own_email" ON public.organization_invitations;

CREATE POLICY "org_invitations_view_own_email"
ON public.organization_invitations
FOR SELECT
USING (
  -- Org admins can manage all invitations for their organization
  user_can_manage_org_membership(auth.uid(), organization_id) 
  OR 
  -- Authenticated users can see invitations sent to their email address
  ((auth.uid() IS NOT NULL) AND (email = (
    SELECT users.email FROM auth.users WHERE users.id = auth.uid()
  )::text))
);