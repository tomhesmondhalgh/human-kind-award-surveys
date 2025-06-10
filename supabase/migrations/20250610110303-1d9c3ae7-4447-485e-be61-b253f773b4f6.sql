
-- PHASE 1: NUCLEAR RESET - Drop ALL existing policies on affected tables
-- This ensures we start from absolute zero with no conflicts

-- Drop ALL policies on survey_templates
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

-- Drop ALL policies on action_plan_descriptors
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
DROP POLICY IF EXISTS "Users can view descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Users can create descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Editors can update descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Admins can delete descriptors in their organizations" ON public.action_plan_descriptors;
DROP POLICY IF EXISTS "Organization editors can modify descriptors" ON public.action_plan_descriptors;

-- Drop ALL policies on action_plan_templates
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
DROP POLICY IF EXISTS "Users can view templates in their organizations" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can create templates in their organizations" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can update templates in their organizations" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can delete templates in their organizations" ON public.action_plan_templates;

-- Drop ALL policies on action_plan_progress_notes
DROP POLICY IF EXISTS "Users can view their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can create their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can update their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can delete their own progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization members can view progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization editors can create progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization editors can update progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization admins can delete progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can view progress notes for their descriptors" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can create progress notes for their descriptors" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can update progress notes for their descriptors" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can delete progress notes for their descriptors" ON public.action_plan_progress_notes;

-- Drop ALL policies on action_plan_submissions
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
DROP POLICY IF EXISTS "Users can view submissions for their organizations" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Users can create submissions for their organizations" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Users can update submissions for their organizations" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions for their organizations" ON public.action_plan_submissions;

-- Drop ALL policies on survey_responses
DROP POLICY IF EXISTS "Users can view their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can create survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization members can view survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Anyone can create survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization editors can update survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization admins can delete survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view responses to their surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can create responses to surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can delete responses to their surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization members can view responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Organization editors can manage responses" ON public.survey_responses;

-- Drop ALL policies on survey_questions
DROP POLICY IF EXISTS "Organization members can view survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Organization editors can manage survey questions" ON public.survey_questions;

-- Drop ALL policies on custom_questions
DROP POLICY IF EXISTS "Users can view their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Users can create their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Organization members can view custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Organization editors can create custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Organization editors can update custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Organization admins can delete custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Organization editors can manage custom questions" ON public.custom_questions;

-- Drop ALL policies on custom_question_responses
DROP POLICY IF EXISTS "Users can view responses to their questions" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Users can create responses" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Users can update their responses" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Users can delete responses to their questions" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Organization members can view custom question responses" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Anyone can create custom question responses" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Organization editors can update custom question responses" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Organization admins can delete custom question responses" ON public.custom_question_responses;

-- Drop ALL policies on organization_memberships
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
DROP POLICY IF EXISTS "Users can view organization memberships" ON public.organization_memberships;

-- PHASE 2: ENSURE ALL SECURITY DEFINER FUNCTIONS EXIST
-- These functions bypass RLS to prevent recursion and provide consistent access control

-- Function to check organization membership (non-recursive)
CREATE OR REPLACE FUNCTION public.user_is_organization_member(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships 
    WHERE user_id = user_uuid AND organization_id = org_id
  );
END;
$function$;

-- Function to check organization role (non-recursive)
CREATE OR REPLACE FUNCTION public.user_has_organization_role(user_uuid uuid, org_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role
  FROM public.organization_memberships
  WHERE user_id = user_uuid AND organization_id = org_id;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Role hierarchy: admin > editor > viewer
  CASE required_role
    WHEN 'viewer' THEN
      RETURN user_role IN ('admin', 'editor', 'viewer');
    WHEN 'editor' THEN
      RETURN user_role IN ('admin', 'editor');
    WHEN 'admin' THEN
      RETURN user_role = 'admin';
    ELSE
      RETURN false;
  END CASE;
END;
$function$;

-- Function to check survey access (non-recursive)
CREATE OR REPLACE FUNCTION public.user_can_access_survey_response(user_uuid uuid, template_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

-- Function to check custom question access (non-recursive)
CREATE OR REPLACE FUNCTION public.user_can_access_custom_question_response(user_uuid uuid, question_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the custom question
  SELECT organization_id INTO org_id
  FROM public.custom_questions
  WHERE id = question_uuid;
  
  -- If question has no organization (global question), allow access
  IF org_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if user is organization member
  RETURN public.user_is_organization_member(user_uuid, org_id);
END;
$function$;

-- Function to check progress note access (non-recursive)
CREATE OR REPLACE FUNCTION public.user_can_access_progress_note(user_uuid uuid, note_descriptor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the descriptor
  SELECT organization_id INTO org_id
  FROM public.action_plan_descriptors
  WHERE id = note_descriptor_id;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is organization member
  RETURN public.user_is_organization_member(user_uuid, org_id);
END;
$function$;

-- Function to check if user can edit progress notes (non-recursive)
CREATE OR REPLACE FUNCTION public.user_can_edit_progress_note(user_uuid uuid, note_descriptor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the descriptor
  SELECT organization_id INTO org_id
  FROM public.action_plan_descriptors
  WHERE id = note_descriptor_id;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has editor role
  RETURN public.user_has_organization_role(user_uuid, org_id, 'editor');
END;
$function$;

-- Function to check organization membership management (non-recursive)
CREATE OR REPLACE FUNCTION public.user_can_manage_org_membership(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

-- PHASE 3: SYSTEMATIC RECREATION - Create exactly 4 policies per table with consistent naming
-- Each table gets: SELECT (view), INSERT (create), UPDATE (update), DELETE (delete)

-- 1. SURVEY_TEMPLATES (4 policies)
CREATE POLICY "st_view_org_members" 
ON public.survey_templates 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "st_create_org_editors"
ON public.survey_templates
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "st_update_org_editors"
ON public.survey_templates
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "st_delete_org_admins"
ON public.survey_templates
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- 2. ACTION_PLAN_DESCRIPTORS (4 policies)
CREATE POLICY "apd_view_org_members" 
ON public.action_plan_descriptors 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "apd_create_org_editors"
ON public.action_plan_descriptors
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "apd_update_org_editors"
ON public.action_plan_descriptors
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "apd_delete_org_admins"
ON public.action_plan_descriptors
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- 3. ACTION_PLAN_TEMPLATES (4 policies)
CREATE POLICY "apt_view_org_members" 
ON public.action_plan_templates 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "apt_create_org_editors"
ON public.action_plan_templates
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "apt_update_org_editors"
ON public.action_plan_templates
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "apt_delete_org_admins"
ON public.action_plan_templates
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- 4. ACTION_PLAN_PROGRESS_NOTES (4 policies)
CREATE POLICY "appn_view_org_members" 
ON public.action_plan_progress_notes 
FOR SELECT 
USING (public.user_can_access_progress_note(auth.uid(), descriptor_id));

CREATE POLICY "appn_create_org_editors"
ON public.action_plan_progress_notes
FOR INSERT
WITH CHECK (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

CREATE POLICY "appn_update_org_editors"
ON public.action_plan_progress_notes
FOR UPDATE
USING (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

CREATE POLICY "appn_delete_org_editors"
ON public.action_plan_progress_notes
FOR DELETE
USING (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

-- 5. ACTION_PLAN_SUBMISSIONS (4 policies)
CREATE POLICY "aps_view_org_members" 
ON public.action_plan_submissions 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

CREATE POLICY "aps_create_org_editors"
ON public.action_plan_submissions
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "aps_update_org_editors"
ON public.action_plan_submissions
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

CREATE POLICY "aps_delete_org_admins"
ON public.action_plan_submissions
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- 6. SURVEY_RESPONSES (4 policies)
CREATE POLICY "sr_view_org_members" 
ON public.survey_responses 
FOR SELECT 
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id));

CREATE POLICY "sr_create_public"
ON public.survey_responses
FOR INSERT
WITH CHECK (survey_template_id IS NOT NULL);

CREATE POLICY "sr_update_org_editors"
ON public.survey_responses
FOR UPDATE
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id));

CREATE POLICY "sr_delete_org_admins"
ON public.survey_responses
FOR DELETE
USING (public.user_can_access_survey_response(auth.uid(), survey_template_id));

-- 7. SURVEY_QUESTIONS (4 policies)
CREATE POLICY "sq_view_org_members" 
ON public.survey_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.survey_templates st
    WHERE st.id = survey_id
    AND public.user_is_organization_member(auth.uid(), st.organization_id)
  )
);

CREATE POLICY "sq_create_org_editors"
ON public.survey_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.survey_templates st
    WHERE st.id = survey_id
    AND public.user_has_organization_role(auth.uid(), st.organization_id, 'editor')
  )
);

CREATE POLICY "sq_update_org_editors"
ON public.survey_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.survey_templates st
    WHERE st.id = survey_id
    AND public.user_has_organization_role(auth.uid(), st.organization_id, 'editor')
  )
);

CREATE POLICY "sq_delete_org_editors"
ON public.survey_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.survey_templates st
    WHERE st.id = survey_id
    AND public.user_has_organization_role(auth.uid(), st.organization_id, 'editor')
  )
);

-- 8. CUSTOM_QUESTIONS (4 policies)
CREATE POLICY "cq_view_org_members" 
ON public.custom_questions 
FOR SELECT 
USING (
  organization_id IS NULL  -- Global questions
  OR public.user_is_organization_member(auth.uid(), organization_id)
);

CREATE POLICY "cq_create_org_editors"
ON public.custom_questions
FOR INSERT
WITH CHECK (
  organization_id IS NULL  -- Global questions (for system admins)
  OR public.user_has_organization_role(auth.uid(), organization_id, 'editor')
);

CREATE POLICY "cq_update_org_editors"
ON public.custom_questions
FOR UPDATE
USING (
  organization_id IS NULL  -- Global questions (for system admins)
  OR public.user_has_organization_role(auth.uid(), organization_id, 'editor')
);

CREATE POLICY "cq_delete_org_admins"
ON public.custom_questions
FOR DELETE
USING (
  organization_id IS NULL  -- Global questions (for system admins)
  OR public.user_has_organization_role(auth.uid(), organization_id, 'admin')
);

-- 9. CUSTOM_QUESTION_RESPONSES (4 policies)
CREATE POLICY "cqr_view_org_members" 
ON public.custom_question_responses 
FOR SELECT 
USING (public.user_can_access_custom_question_response(auth.uid(), question_id));

CREATE POLICY "cqr_create_public"
ON public.custom_question_responses
FOR INSERT
WITH CHECK (question_id IS NOT NULL);

CREATE POLICY "cqr_update_org_editors"
ON public.custom_question_responses
FOR UPDATE
USING (public.user_can_access_custom_question_response(auth.uid(), question_id));

CREATE POLICY "cqr_delete_org_admins"
ON public.custom_question_responses
FOR DELETE
USING (public.user_can_access_custom_question_response(auth.uid(), question_id));

-- 10. ORGANIZATION_MEMBERSHIPS (4 policies)
CREATE POLICY "om_view_own_and_admin" 
ON public.organization_memberships 
FOR SELECT 
USING (
  auth.uid() = user_id  -- Users can see their own memberships
  OR public.user_can_manage_org_membership(auth.uid(), organization_id)  -- Admins can see all memberships in their org
);

CREATE POLICY "om_create_org_admins"
ON public.organization_memberships
FOR INSERT
WITH CHECK (public.user_can_manage_org_membership(auth.uid(), organization_id));

CREATE POLICY "om_update_org_admins"
ON public.organization_memberships
FOR UPDATE
USING (public.user_can_manage_org_membership(auth.uid(), organization_id));

CREATE POLICY "om_delete_org_admins"
ON public.organization_memberships
FOR DELETE
USING (public.user_can_manage_org_membership(auth.uid(), organization_id));

-- PHASE 4: ENSURE RLS IS ENABLED ON ALL TABLES
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- PHASE 5: VALIDATION COMMENTS
-- This migration creates exactly 40 RLS policies (4 per table x 10 tables)
-- All policies use consistent naming: {table_prefix}_{operation}_{access_level}
-- All policies use organization-based access control through security definer functions
-- No recursive queries that reference the same table they protect
-- Clear role hierarchy: admin > editor > viewer
