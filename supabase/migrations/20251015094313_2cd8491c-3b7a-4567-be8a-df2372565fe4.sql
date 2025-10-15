-- Fix for Fiona Robertson's account: Create organization and membership
-- This addresses the "No Organisation Found" issue

-- Step 1: Create the organization for Creative Education Ltd
INSERT INTO public.organizations (name, address, urn)
VALUES (
  'Creative Education Ltd',
  '49 Station Road, Polegate, East Sussex, BN26 6EA, United Kingdom',
  NULL
);

-- Step 2: Add Fiona as an admin member of this organization
-- Her user_id is 3cd5b90a-a67b-4374-bf79-4e3ec8e42cb6
INSERT INTO public.organization_memberships (user_id, organization_id, role, is_primary)
SELECT 
  '3cd5b90a-a67b-4374-bf79-4e3ec8e42cb6'::uuid,
  id,
  'admin'::organization_role,
  true
FROM public.organizations
WHERE name = 'Creative Education Ltd'
  AND address = '49 Station Road, Polegate, East Sussex, BN26 6EA, United Kingdom'
LIMIT 1;