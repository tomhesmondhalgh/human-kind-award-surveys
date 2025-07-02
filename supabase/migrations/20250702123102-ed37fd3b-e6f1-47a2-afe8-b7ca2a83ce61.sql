-- Phase 1: Database Function Cleanup (Fixed Order)
-- Drop the RLS policy first, then the function

-- Drop the policy that depends on get_current_user_email()
DROP POLICY IF EXISTS "org_invitations_view_access" ON public.organization_invitations;

-- Now we can safely drop the problematic function
DROP FUNCTION IF EXISTS public.get_current_user_email();

-- Create a new policy that doesn't rely on the auth.users table
CREATE POLICY "org_invitations_view_access" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (
    -- Allow organization admins to view all invitations for their org
    user_can_manage_org_membership(auth.uid(), organization_id)
    -- Note: Email-based access for invitees will be handled at application level
    -- since we can't safely access auth.users from RLS policies
  );

-- Add a comment explaining the change
COMMENT ON POLICY "org_invitations_view_access" ON public.organization_invitations IS 
'Allow org admins to view invitations. Email-based access (for invitees) handled at application level.';