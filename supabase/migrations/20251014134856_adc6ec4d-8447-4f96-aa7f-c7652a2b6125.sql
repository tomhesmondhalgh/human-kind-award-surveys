-- Fix the security definer warning by explicitly setting SECURITY INVOKER
-- This ensures the view runs with the permissions of the querying user, not the view creator
CREATE OR REPLACE VIEW public.public_survey_templates
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  date,
  close_date,
  status,
  organization_id,
  created_at
FROM public.survey_templates;