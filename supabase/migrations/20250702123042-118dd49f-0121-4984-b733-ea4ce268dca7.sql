-- Phase 1: Database Function Cleanup
-- Remove the problematic get_current_user_email() function that's causing permission errors

-- Drop the function that's trying to access auth.users table
DROP FUNCTION IF EXISTS public.get_current_user_email();

-- Update the RLS policy that was using this function
-- The org_invitations_view_access policy needs to be updated
DROP POLICY IF EXISTS "org_invitations_view_access" ON public.organization_invitations;

-- Create a new policy that doesn't rely on email comparison from auth.users
-- Instead, we'll allow users to view invitations sent to them via email OR if they're org admins
CREATE POLICY "org_invitations_view_access" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (
    -- Allow organization admins to view all invitations for their org
    user_can_manage_org_membership(auth.uid(), organization_id)
    -- Note: Email-based access will be handled at application level
    -- since we can't safely access auth.users from RLS policies
  );

-- Add a comment explaining the change
COMMENT ON POLICY "org_invitations_view_access" ON public.organization_invitations IS 
'Allow org admins to view invitations. Email-based access (for invitees) handled at application level.';