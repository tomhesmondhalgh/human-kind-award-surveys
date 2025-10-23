-- Fix organization_invitations RLS policy to allow token-based lookup
-- This allows users to view invitation details via the unique token before they log in or join the organization

DROP POLICY IF EXISTS "org_invitations_view_org_members" ON public.organization_invitations;

CREATE POLICY "org_invitations_view_org_members" 
ON public.organization_invitations
FOR SELECT 
USING (
  -- Organization members can view invitations
  user_is_organization_member(auth.uid(), organization_id) 
  -- Invited users (logged in with matching email) can view their invitations
  OR ((auth.uid() IS NOT NULL) AND (email = auth.email()))
  -- Anyone can view valid invitations by token (for the accept-invitation page)
  OR (
    token IS NOT NULL 
    AND accepted_at IS NULL 
    AND expires_at > now()
  )
);