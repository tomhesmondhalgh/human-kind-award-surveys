
-- Step 1: Drop ALL existing RLS policies on organization_memberships to eliminate recursion
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Organization admins can manage memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can view organization memberships" ON public.organization_memberships;

-- Step 2: Create simple, non-recursive RLS policies
-- Policy 1: Users can see their own memberships (no table self-reference)
CREATE POLICY "Users can view own memberships" 
ON public.organization_memberships 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Users can insert memberships for themselves (no table self-reference)  
CREATE POLICY "Users can insert own memberships"
ON public.organization_memberships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own memberships (no table self-reference)
CREATE POLICY "Users can update own memberships"
ON public.organization_memberships
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy 4: Users can delete their own memberships (no table self-reference)
CREATE POLICY "Users can delete own memberships"
ON public.organization_memberships
FOR DELETE
USING (auth.uid() = user_id);

-- Step 3: Ensure the get_user_organizations function is properly set up as security definer
-- This function bypasses RLS and can safely query organization_memberships
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid)
RETURNS TABLE(id uuid, name text, address text, urn text, created_at timestamp with time zone, updated_at timestamp with time zone, role organization_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Add logging to help debug
  RAISE LOG 'get_user_organizations called for user: %', user_uuid;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.address,
    o.urn,
    o.created_at,
    o.updated_at,
    om.role
  FROM 
    public.organizations o
  INNER JOIN 
    public.organization_memberships om ON o.id = om.organization_id
  WHERE 
    om.user_id = user_uuid;
    
  RAISE LOG 'get_user_organizations returning % rows', (SELECT COUNT(*) FROM public.organization_memberships WHERE user_id = user_uuid);
END;
$function$;

-- Step 4: Create a simple function to check organization membership without recursion
CREATE OR REPLACE FUNCTION public.user_is_organization_member(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships 
    WHERE user_id = user_uuid AND organization_id = org_id
  );
END;
$function$;
