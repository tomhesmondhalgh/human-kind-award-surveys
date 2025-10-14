-- Create a public-safe view that excludes sensitive email data
CREATE OR REPLACE VIEW public.public_survey_templates AS
SELECT 
  id,
  name,
  date,
  close_date,
  status,
  organization_id,
  created_at
FROM public.survey_templates;

-- Grant public read access to the view
GRANT SELECT ON public.public_survey_templates TO anon, authenticated;

-- Add comment explaining purpose
COMMENT ON VIEW public.public_survey_templates IS 
  'Public-safe view of survey templates that excludes sensitive email data';

-- Remove the public access policy that was exposing email addresses
DROP POLICY IF EXISTS "st_view_public_active" ON public.survey_templates;