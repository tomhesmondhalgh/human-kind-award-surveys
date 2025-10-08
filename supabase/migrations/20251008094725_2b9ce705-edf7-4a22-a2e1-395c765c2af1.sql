-- Fix survey_templates constraint issue
-- First, remove the incorrectly named constraint
ALTER TABLE public.survey_templates 
DROP CONSTRAINT IF EXISTS survey_templates_creator_id_fkey;

-- Get the first available organization (or create a default one if needed)
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Get the first organization
  SELECT id INTO default_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  
  -- If no organizations exist, this is a problem that needs manual intervention
  -- But for now, update orphaned surveys to point to the first valid organization
  IF default_org_id IS NOT NULL THEN
    UPDATE public.survey_templates
    SET organization_id = default_org_id
    WHERE organization_id NOT IN (SELECT id FROM public.organizations);
  END IF;
END $$;

-- Now add the correct foreign key constraint
ALTER TABLE public.survey_templates 
ADD CONSTRAINT survey_templates_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add helpful index for performance
CREATE INDEX IF NOT EXISTS idx_survey_templates_organization_id 
ON public.survey_templates(organization_id);