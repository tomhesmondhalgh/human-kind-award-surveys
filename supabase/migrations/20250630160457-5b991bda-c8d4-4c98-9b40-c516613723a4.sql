
-- Clean up conflicting RLS policies on organization_invitations table
-- Drop the broad "ALL" policy that conflicts with specific operation policies
DROP POLICY IF EXISTS "org_invitations_admin_manage_new" ON public.organization_invitations;

-- Also drop any other potentially conflicting policies to ensure clean state
DROP POLICY IF EXISTS "org_invitations_view_by_token" ON public.organization_invitations;

-- Ensure we have clean, specific policies for each operation
-- Keep the existing specific policies that were created in the latest migration:
-- - org_invitations_view_access (SELECT)
-- - org_invitations_create_access (INSERT) 
-- - org_invitations_update_access (UPDATE)
-- - org_invitations_delete_access (DELETE)

-- Verify RLS is enabled
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
