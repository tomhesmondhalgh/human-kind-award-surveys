-- Drop the insecure public creation policy
DROP POLICY IF EXISTS "cqr_create_public" ON public.custom_question_responses;

-- Create a security definer function to validate if a custom question response can be created
-- This checks if the associated survey is open and active
CREATE OR REPLACE FUNCTION public.can_respond_to_custom_question(question_uuid uuid, response_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  survey_id uuid;
  survey_is_open boolean;
BEGIN
  -- Get the survey_template_id from the response
  SELECT survey_template_id INTO survey_id
  FROM public.survey_responses
  WHERE id = response_uuid;
  
  -- If no survey found, deny access
  IF survey_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the survey is open (status = 'Sent' and close_date is null or in future)
  SELECT (
    status = 'Sent' AND 
    (close_date IS NULL OR close_date > now())
  ) INTO survey_is_open
  FROM public.survey_templates
  WHERE id = survey_id;
  
  -- Return true if survey is open
  RETURN COALESCE(survey_is_open, false);
END;
$$;

-- Create new secure policy that validates survey is open
CREATE POLICY "cqr_create_validated" ON public.custom_question_responses
FOR INSERT
WITH CHECK (
  question_id IS NOT NULL 
  AND response_id IS NOT NULL
  AND public.can_respond_to_custom_question(question_id, response_id)
);