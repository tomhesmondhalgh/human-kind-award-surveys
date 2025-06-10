
-- Fix recursive RLS policies on survey_templates table
-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Admins can delete surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Editors can create surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Editors can update surveys in their organizations" ON public.survey_templates;

-- Create new non-recursive policies using security definer functions
-- Policy 1: Users can view surveys in organizations they belong to
CREATE POLICY "Users can view organization surveys" 
ON public.survey_templates 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

-- Policy 2: Organization admins can delete surveys
CREATE POLICY "Organization admins can delete surveys"
ON public.survey_templates
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- Policy 3: Editors and admins can create surveys
CREATE POLICY "Editors can create organization surveys"
ON public.survey_templates
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

-- Policy 4: Editors and admins can update surveys
CREATE POLICY "Editors can update organization surveys"
ON public.survey_templates
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));
