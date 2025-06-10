
-- Fix recursive RLS policies on action_plan_descriptors table
-- Drop ALL existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Users can create descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Editors can update descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Admins can delete descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization members can view descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can create descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can update descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization admins can delete descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can modify descriptors" ON public.action_plan_descriptors;

-- Ensure RLS is enabled on the table
ALTER TABLE public.action_plan_descriptors ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies using security definer functions
-- Policy 1: Organization members can view descriptors
CREATE POLICY "Organization members can view descriptors" 
ON public.action_plan_descriptors 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

-- Policy 2: Organization editors and admins can create descriptors
CREATE POLICY "Organization editors can create descriptors"
ON public.action_plan_descriptors
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

-- Policy 3: Organization editors and admins can update descriptors
CREATE POLICY "Organization editors can update descriptors"
ON public.action_plan_descriptors
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

-- Policy 4: Organization admins can delete descriptors
CREATE POLICY "Organization admins can delete descriptors"
ON public.action_plan_descriptors
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));
