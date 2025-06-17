
-- Fix database schema and RLS policies for team management

-- 1. Add foreign key constraint from organization_memberships to profiles
ALTER TABLE public.organization_memberships 
ADD CONSTRAINT fk_organization_memberships_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Add foreign key constraint from organization_invitations to profiles  
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT fk_organization_invitations_invited_by 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Add foreign key constraint from organization_invitations to organizations
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT fk_organization_invitations_organization_id 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Add foreign key constraint from organization_memberships to organizations
ALTER TABLE public.organization_memberships 
ADD CONSTRAINT fk_organization_memberships_organization_id 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Drop the problematic RLS policy on organization_invitations that tries to access auth.users
DROP POLICY IF EXISTS "org_invitations_view_own_email" ON public.organization_invitations;

-- 6. Create a new RLS policy for organization_invitations that uses profiles table
CREATE POLICY "org_invitations_view_own_email" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email IN (
        SELECT email FROM auth.users WHERE id = public.profiles.id
      )
    )
  );

-- 7. Create a security definer function to get user email safely
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- 8. Update the organization_invitations policy to use the security definer function
DROP POLICY IF EXISTS "org_invitations_view_own_email" ON public.organization_invitations;

CREATE POLICY "org_invitations_view_own_email" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (
    email = public.get_current_user_email()
  );

-- 9. Ensure RLS is enabled on all relevant tables
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 10. Update organization_memberships policies to handle the foreign key properly
DROP POLICY IF EXISTS "om_view_own_and_admin" ON public.organization_memberships;
DROP POLICY IF EXISTS "om_create_org_admins" ON public.organization_memberships;
DROP POLICY IF EXISTS "om_update_org_admins" ON public.organization_memberships;
DROP POLICY IF EXISTS "om_delete_org_admins" ON public.organization_memberships;

-- Recreate organization_memberships policies
CREATE POLICY "om_view_own_and_admin" 
  ON public.organization_memberships 
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR public.user_has_organization_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "om_create_org_admins" 
  ON public.organization_memberships 
  FOR INSERT 
  WITH CHECK (
    public.user_has_organization_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "om_update_org_admins" 
  ON public.organization_memberships 
  FOR UPDATE 
  USING (
    public.user_has_organization_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "om_delete_org_admins" 
  ON public.organization_memberships 
  FOR DELETE 
  USING (
    public.user_has_organization_role(auth.uid(), organization_id, 'admin')
  );
