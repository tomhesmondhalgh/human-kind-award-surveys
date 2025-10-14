-- Add public access policy for active surveys
CREATE POLICY "st_view_public_active" ON "public"."survey_templates"
FOR SELECT
TO public
USING (
  (status != 'Archived'::survey_status) 
  AND (date <= now()) 
  AND (close_date IS NULL OR close_date >= now())
);