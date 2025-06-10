
-- Fix recursive RLS policies on action_plan_templates table
-- Drop ALL existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view templates in their organizations" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can create templates in their organizations" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can update templates in their organizations" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Users can delete templates in their organizations" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization members can view templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization editors can create templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization editors can update templates" ON public.action_plan_templates;
DROP POLICY IF EXISTS "Organization admins can delete templates" ON public.action_plan_templates;

-- Ensure RLS is enabled on the table
ALTER TABLE public.action_plan_templates ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies using security definer functions
-- Policy 1: Organization members can view templates
CREATE POLICY "Organization members can view templates" 
ON public.action_plan_templates 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

-- Policy 2: Organization editors and admins can create templates
CREATE POLICY "Organization editors can create templates"
ON public.action_plan_templates
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

-- Policy 3: Organization editors and admins can update templates
CREATE POLICY "Organization editors can update templates"
ON public.action_plan_templates
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

-- Policy 4: Organization admins can delete templates
CREATE POLICY "Organization admins can delete templates"
ON public.action_plan_templates
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));

-- Fix recursive RLS policies on action_plan_progress_notes table
-- Drop ALL existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view progress notes for their descriptors" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can create progress notes for their descriptors" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can update progress notes for their descriptors" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Users can delete progress notes for their descriptors" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization members can view progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization editors can create progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization editors can update progress notes" ON public.action_plan_progress_notes;
DROP POLICY IF EXISTS "Organization admins can delete progress notes" ON public.action_plan_progress_notes;

-- Ensure RLS is enabled on the table
ALTER TABLE public.action_plan_progress_notes ENABLE ROW LEVEL SECURITY;

-- For progress notes, we need a function to check organization access via descriptor
CREATE OR REPLACE FUNCTION public.user_can_access_progress_note(user_uuid uuid, note_descriptor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.user_can_edit_progress_note(user_uuid uuid, note_descriptor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create new non-recursive policies for progress notes
-- Policy 1: Organization members can view progress notes
CREATE POLICY "Organization members can view progress notes" 
ON public.action_plan_progress_notes 
FOR SELECT 
USING (public.user_can_access_progress_note(auth.uid(), descriptor_id));

-- Policy 2: Organization editors and admins can create progress notes
CREATE POLICY "Organization editors can create progress notes"
ON public.action_plan_progress_notes
FOR INSERT
WITH CHECK (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

-- Policy 3: Organization editors and admins can update progress notes
CREATE POLICY "Organization editors can update progress notes"
ON public.action_plan_progress_notes
FOR UPDATE
USING (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

-- Policy 4: Organization admins can delete progress notes
CREATE POLICY "Organization admins can delete progress notes"
ON public.action_plan_progress_notes
FOR DELETE
USING (public.user_can_edit_progress_note(auth.uid(), descriptor_id));

-- Fix recursive RLS policies on action_plan_submissions table
-- Drop ALL existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view submissions for their organizations" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Users can create submissions for their organizations" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Users can update submissions for their organizations" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions for their organizations" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization members can view submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization editors can create submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization editors can update submissions" ON public.action_plan_submissions;
DROP POLICY IF EXISTS "Organization admins can delete submissions" ON public.action_plan_submissions;

-- Ensure RLS is enabled on the table
ALTER TABLE public.action_plan_submissions ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies for submissions
-- Policy 1: Organization members can view submissions
CREATE POLICY "Organization members can view submissions" 
ON public.action_plan_submissions 
FOR SELECT 
USING (public.user_is_organization_member(auth.uid(), organization_id));

-- Policy 2: Organization editors and admins can create submissions
CREATE POLICY "Organization editors can create submissions"
ON public.action_plan_submissions
FOR INSERT
WITH CHECK (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

-- Policy 3: Organization editors and admins can update submissions
CREATE POLICY "Organization editors can update submissions"
ON public.action_plan_submissions
FOR UPDATE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'editor'));

-- Policy 4: Organization admins can delete submissions
CREATE POLICY "Organization admins can delete submissions"
ON public.action_plan_submissions
FOR DELETE
USING (public.user_has_organization_role(auth.uid(), organization_id, 'admin'));
