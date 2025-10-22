-- Create a SECURITY DEFINER function to safely get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS org_invitations_view_org_members ON public.organization_invitations;

-- Create new policy that uses the helper function
CREATE POLICY org_invitations_view_org_members
  ON public.organization_invitations
  FOR SELECT
  TO public
  USING (
    user_is_organization_member(auth.uid(), organization_id) 
    OR 
    (auth.uid() IS NOT NULL AND email = get_current_user_email())
  );