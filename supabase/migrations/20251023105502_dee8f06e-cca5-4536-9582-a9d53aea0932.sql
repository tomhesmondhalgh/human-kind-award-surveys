-- Fix organizations table RLS policy permission error
-- The orgs_view_via_invitation policy tries to access auth.users which causes permission errors
-- Replace the direct auth.users query with Supabase's built-in auth.email() function

-- Drop the existing policy
DROP POLICY IF EXISTS "orgs_view_via_invitation" ON public.organizations;

-- Recreate the policy using auth.email() instead of querying auth.users
CREATE POLICY "orgs_view_via_invitation" 
ON public.organizations
FOR SELECT 
USING (
  user_is_organization_member(auth.uid(), id) 
  OR (EXISTS (
    SELECT 1 
    FROM public.organization_invitations
    WHERE organization_invitations.organization_id = organizations.id
      AND organization_invitations.expires_at > now()
      AND organization_invitations.accepted_at IS NULL
      AND auth.uid() IS NOT NULL
      AND organization_invitations.email = auth.email()
  ))
);