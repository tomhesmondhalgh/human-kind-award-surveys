
-- First, let's check what's causing the permission denied error
-- The issue is likely with the RLS policies on organization_invitations table

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "org_invitations_view_own_email" ON public.organization_invitations;
DROP POLICY IF EXISTS "org_invitations_admin_manage" ON public.organization_invitations;
DROP POLICY IF EXISTS "org_invitations_admin_insert" ON public.organization_invitations;
DROP POLICY IF EXISTS "org_invitations_admin_select" ON public.organization_invitations;

-- Create comprehensive RLS policies for organization_invitations
-- Policy for viewing invitations (for the invited person by email OR organization admins)
CREATE POLICY "org_invitations_view_access" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (
    email = get_current_user_email() OR
    user_can_manage_org_membership(auth.uid(), organization_id)
  );

-- Policy for creating invitations (organization admins only)
CREATE POLICY "org_invitations_create_access" 
  ON public.organization_invitations 
  FOR INSERT 
  WITH CHECK (
    user_can_manage_org_membership(auth.uid(), organization_id)
  );

-- Policy for updating invitations (organization admins only)
CREATE POLICY "org_invitations_update_access" 
  ON public.organization_invitations 
  FOR UPDATE 
  USING (
    user_can_manage_org_membership(auth.uid(), organization_id)
  );

-- Policy for deleting invitations (organization admins only)
CREATE POLICY "org_invitations_delete_access" 
  ON public.organization_invitations 
  FOR DELETE 
  USING (
    user_can_manage_org_membership(auth.uid(), organization_id)
  );

-- Ensure the table has RLS enabled
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
