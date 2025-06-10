
-- First, let's clean up all existing policies systematically
-- Survey Templates
DROP POLICY IF EXISTS "Users can view their own survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can create their own survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can update their own survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can delete their own survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization members can view survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization editors can create survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization editors can update survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization admins can delete survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can view surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Admins can delete surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Editors can create surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Editors can update surveys in their organizations" ON public.survey_templates;
DROP POLICY IF EXISTS "Users can view organization surveys" ON public.survey_templates;
DROP POLICY IF EXISTS "Organization admins can delete surveys" ON public.survey_templates;
DROP POLICY IF EXISTS "Editors can create organization surveys" ON public.survey_templates;
DROP POLICY IF EXISTS "Editors can update organization surveys" ON public.survey_templates;

-- Action Plan Descriptors
DROP POLICY IF EXISTS "Users can view their own descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Users can create their own descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Users can update their own descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Users can delete their own descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization members can view descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can create descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can update descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization admins can delete descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization members can view action plan descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can create action plan descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can update action plan descriptors" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization admins can delete action plan descriptors" ON public.action_plan_descriptors;

-- Action Plan Templates
DROP POLICY IF EXISTS "Users can view their own templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization members can view templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization editors can create templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization editors can update templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization admins can delete templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization members can view action plan templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization editors can create action plan templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization editors can update action plan templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization admins can delete action plan templates" ON public.action_plan_templates;

-- Action Plan Progress Notes
DROP POLICY IF EXISTS "Users can view their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can create their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can update their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can delete their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization members can view progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization editors can create progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization editors can update progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization admins can delete progress notes" ON public.action_plan_progress_notes;

-- Action Plan Submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Users can create their own submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Users can delete their own submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization members can view submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization editors can create submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization editors can update submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization admins can delete submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization members can view action plan submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization editors can create action plan submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization editors can update action plan submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization admins can delete action plan submissions" ON public.action_plan_submissions;

-- Survey Responses
DROP POLICY IF EXISTS "Users can view their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can create survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization members can view survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Anyone can create survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization editors can update survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization admins can delete survey responses" ON public.survey_responses;

-- Survey Questions
DROP POLICY IF EXISTS "Organization members can view survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Organization editors can manage survey questions" ON public.survey_questions;

-- Organization Memberships
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Organization admins can manage memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can update own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can delete own memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Organization admins can view all memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Organization admins can insert memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Organization admins can update memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Organization admins can delete memberships" ON public.organization_memberships;

-- Now create the security definer function for organization membership management
CREATE OR REPLACE FUNCTION public.user_can_manage_org_membership(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin of the organization using direct query
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships 
    WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND role = 'admin'
  );
END;
$function$;

-- Create all the clean policies
-- Survey Templates
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

-- Action Plan Descriptors
CREATE POLICY "Organization members can view action plan descriptors" 
ON public.action_plan_descriptors 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization editors can create action plan descriptors"
ON public.action_plan_descriptors
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization editors can update action plan descriptors"
ON public.action_plan_descriptors
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization admins can delete action plan descriptors"
ON public.action_plan_descriptors
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- Action Plan Templates
CREATE POLICY "Organization members can view action plan templates" 
ON public.action_plan_templates 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization editors can create action plan templates"
ON public.action_plan_templates
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization editors can update action plan templates"
ON public.action_plan_templates
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization admins can delete action plan templates"
ON public.action_plan_templates
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- Action Plan Progress Notes
CREATE POLICY "Organization members can view progress notes" 
ON public.action_plan_progress_notes 
FOR SELECT 
USING (public.user_can_access_progress_note(auth.uid(), descriptor_id));

CREATE POLICY "Organization editors can create progress notes"
ON public.action_plan_progress_notes
FOR INSERT
WITH CHECK (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

CREATE POLICY "Organization editors can update progress notes"
ON public.action_plan_progress_notes
FOR UPDATE
USING (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

CREATE POLICY "Organization admins can delete progress notes"
ON public.action_plan_progress_notes
FOR DELETE
USING (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

-- Action Plan Submissions
CREATE POLICY "Organization members can view action plan submissions" 
ON public.action_plan_submissions 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization editors can create action plan submissions"
ON public.action_plan_submissions
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization editors can update action plan submissions"
ON public.action_plan_submissions
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "Organization admins can delete action plan submissions"
ON public.action_plan_submissions
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- Survey Responses
CREATE POLICY "Organization members can view survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id));

CREATE POLICY "Anyone can create survey responses"
ON public.survey_responses
FOR INSERT
WITH CHECK (survey_template_id IS NOT NULL);

CREATE POLICY "Organization editors can update survey responses"
ON public.survey_responses
FOR UPDATE
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id));

CREATE POLICY "Organization admins can delete survey responses"
ON public.survey_responses
FOR DELETE
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id));

-- Survey Questions
CREATE POLICY "Organization members can view survey questions" 
ON public.survey_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.survey_templates st
    WHERE st.id = survey_id
    AND public.user_is_organization_member(auth.uid(), st.organization_id)
  )
);

CREATE POLICY "Organization editors can manage survey questions"
ON public.survey_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.survey_templates st
    WHERE st.id = survey_id
    AND public.user_has_organization_role(auth.uid(), st.organization_id, 'editor')
  )
);

-- Organization Memberships (non-recursive)
CREATE POLICY "Users can view their own organization memberships" 
ON public.organization_memberships 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view all memberships"
ON public.organization_memberships
FOR SELECT
USING (public.user_can_manage_org_membership(auth.uid(), organization_id));

CREATE POLICY "Organization admins can insert memberships"
ON public.organization_memberships
FOR INSERT
WITH CHECK (public.user_can_manage_org_membership(auth.uid(), organization_id));

CREATE POLICY "Organization admins can update memberships"
ON public.organization_memberships
FOR UPDATE
USING (public.user_can_manage_org_membership(auth.uid(), organization_id));

CREATE POLICY "Organization admins can delete memberships"
ON public.organization_memberships
FOR DELETE
USING (public.user_can_manage_org_membership(auth.uid(), organization_id));

-- Ensure RLS is enabled on all tables
ALTER TABLE public.action_plan_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
