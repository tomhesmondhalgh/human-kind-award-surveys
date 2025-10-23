-- Fix invitation resend permission error
-- The get_current_user_email() function tries to access auth.users which causes permission errors
-- Replace it with Supabase's built-in auth.email() function

-- Drop the existing policy first (before dropping the function it depends on)
DROP POLICY IF EXISTS "org_invitations_view_org_members" ON public.organization_invitations;

-- Now drop the problematic function
DROP FUNCTION IF EXISTS public.get_current_user_email();

-- Create the updated policy using auth.email() instead
CREATE POLICY "org_invitations_view_org_members" 
ON public.organization_invitations
FOR SELECT 
USING (
  user_is_organization_member(auth.uid(), organization_id) 
  OR ((auth.uid() IS NOT NULL) AND (email = auth.email()))
);