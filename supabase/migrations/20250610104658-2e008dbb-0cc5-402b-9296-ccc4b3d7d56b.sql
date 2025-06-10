
-- Fix recursive RLS policies on survey_templates table
-- The existing migration file already addresses some of these, but let's ensure complete cleanup
-- This will supplement the existing migration to catch any remaining problematic policies

-- Drop any remaining or new problematic policies that might cause recursion
DROP POLICY IF EXISTS "Users can view surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can create surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can update surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can delete surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization members can view surveys" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization editors can create surveys" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization editors can update surveys" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization admins can delete surveys" ON public.survey_templates;

-- Ensure RLS is enabled
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

-- Create clean organization-based policies (these will replace any existing ones)
CREATE POLICY "Organization members can view survey templates" 
ON public.survey_templates 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization editors can create survey templates"
ON public.survey_templates
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization editors can update survey templates"
ON public.survey_templates
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization admins can delete survey templates"
ON public.survey_templates
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- Fix RLS policies on survey_responses table
-- Drop any conflicting policies
DROP POLICY IF EXISTS "Users can view responses to their surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can create responses to surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can delete responses to their surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization members can view responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization editors can manage responses" ON public.survey_responses;

-- Ensure RLS is enabled
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Create function to check survey template access for responses
CREATE OR REPLACE FUNCTION public.user_can_access_survey_response(user_uuid uuid, template_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the survey template
  SELECT organization_id INTO org_id
  FROM public.survey_templates
  WHERE id = template_id;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is organization member
  RETURN public.user_is_organization_member(user_uuid, org_id);
END;
$function$;

-- Create policies for survey_responses
CREATE POLICY "Organization members can view survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id));

-- Anyone can create responses (for public surveys)
CREATE POLICY "Anyone can create survey responses"
ON public.survey_responses
FOR INSERT
WITH CHECK (survey_template_id IS NOT NULL);

-- Organization editors can manage responses
CREATE POLICY "Organization editors can update survey responses"
ON public.survey_responses
FOR UPDATE
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id) 
       AND public.user_has_organization_role(auth.uid(), 
         (SELECT organization_id FROM public.survey_templates WHERE id = survey_template_id), 'editor'));

CREATE POLICY "Organization admins can delete survey responses"
ON public.survey_responses
FOR DELETE
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id) 
       AND public.user_has_organization_role(auth.uid(), 
         (SELECT organization_id FROM public.survey_templates WHERE id = survey_template_id), 'admin'));
