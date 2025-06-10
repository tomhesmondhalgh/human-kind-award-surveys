
-- Fix RLS policies on custom_questions table to be organization-based
-- Drop any existing user-based policies
DROP POLICY IF EXISTS "Users can view their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Users can create their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Organization members can view custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Organization editors can manage custom questions" ON public.custom_questions;

-- First, we need to add organization_id to custom_questions table if it doesn't exist
-- Check if organization_id column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_questions' 
                   AND column_name = 'organization_id') THEN
        ALTER TABLE public.custom_questions ADD COLUMN organization_id UUID;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_custom_questions_organization_id 
        ON public.custom_questions(organization_id);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;

-- Create organization-based policies for custom_questions
CREATE POLICY "Organization members can view custom questions" 
ON public.custom_questions 
FOR SELECT 
USING (
    organization_id IS NULL  -- Allow viewing questions without organization (global questions)
    OR public.user_is_organization_member(auth.uid(), organization_id)
);

CREATE POLICY "Organization editors can create custom questions"
ON public.custom_questions
FOR INSERT
WITH CHECK (
    organization_id IS NULL  -- Allow creating global questions (for admins)
    OR public.user_has_organization_role(auth.uid(), organization_id, 'editor')
);

CREATE POLICY "Organization editors can update custom questions"
ON public.custom_questions
FOR UPDATE
USING (
    organization_id IS NULL  -- Allow updating global questions (for admins)
    OR public.user_has_organization_role(auth.uid(), organization_id, 'editor')
);

CREATE POLICY "Organization admins can delete custom questions"
ON public.custom_questions
FOR DELETE
USING (
    organization_id IS NULL  -- Allow deleting global questions (for admins)
    OR public.user_has_organization_role(auth.uid(), organization_id, 'admin')
);

-- Fix RLS policies on custom_question_responses table
-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view responses to their questions" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Users can create responses" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Users can update their responses" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Users can delete responses to their questions" ON public.custom_question_responses;
DROP POLICY IF EXISTS "Organization members can view custom question responses" ON public.custom_question_responses;

-- Ensure RLS is enabled
ALTER TABLE public.custom_question_responses ENABLE ROW LEVEL SECURITY;

-- Create function to check custom question access for responses
CREATE OR REPLACE FUNCTION public.user_can_access_custom_question_response(user_uuid uuid, question_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create policies for custom_question_responses
CREATE POLICY "Organization members can view custom question responses" 
ON public.custom_question_responses 
FOR SELECT 
USING (public.user_can_access_custom_question_response(auth.uid(), question_id));

-- Anyone can create responses (for survey participation)
CREATE POLICY "Anyone can create custom question responses"
ON public.custom_question_responses
FOR INSERT
WITH CHECK (question_id IS NOT NULL);

-- Organization editors can manage responses
CREATE POLICY "Organization editors can update custom question responses"
ON public.custom_question_responses
FOR UPDATE
USING (public.user_can_access_custom_question_response(auth.uid(), question_id));

CREATE POLICY "Organization admins can delete custom question responses"
ON public.custom_question_responses
FOR DELETE
USING (public.user_can_access_custom_question_response(auth.uid(), question_id));
