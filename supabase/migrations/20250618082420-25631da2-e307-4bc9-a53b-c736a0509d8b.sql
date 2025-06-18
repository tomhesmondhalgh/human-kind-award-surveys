
-- Step 2: Remove the redundant organizations policy
-- The "orgs_view_via_invitation" policy already covers member access plus invitation access
DROP POLICY IF EXISTS "orgs_view_members" ON public.organizations;
