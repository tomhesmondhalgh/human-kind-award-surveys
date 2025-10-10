-- Step 1: Update RLS policy for schools table to allow public read access during sign-up
DROP POLICY IF EXISTS "schools_authenticated_read" ON public.schools;

CREATE POLICY "schools_public_read" 
ON public.schools 
FOR SELECT 
TO public
USING (true);

-- Step 2: Create function to set up new user's organization atomically
CREATE OR REPLACE FUNCTION public.setup_user_organization(
  user_uuid uuid,
  org_name text,
  org_address text,
  org_urn text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Create organization
  INSERT INTO public.organizations (name, address, urn)
  VALUES (org_name, org_address, org_urn)
  RETURNING id INTO new_org_id;
  
  -- Add user as admin with primary flag
  INSERT INTO public.organization_memberships (
    user_id,
    organization_id,
    role,
    is_primary
  ) VALUES (
    user_uuid,
    new_org_id,
    'admin',
    true
  );
  
  RETURN new_org_id;
END;
$$;

-- Step 3: Migrate existing users without organizations
DO $$
DECLARE
  user_record RECORD;
  new_org_id uuid;
BEGIN
  FOR user_record IN 
    SELECT p.id, p.first_name, p.last_name, p.school_name, p.school_address
    FROM profiles p
    LEFT JOIN organization_memberships om ON p.id = om.user_id
    WHERE om.id IS NULL
  LOOP
    -- Create organization for user
    INSERT INTO public.organizations (
      name, 
      address, 
      urn
    )
    VALUES (
      COALESCE(user_record.school_name, user_record.first_name || '''s Organisation'),
      user_record.school_address,
      NULL
    )
    RETURNING id INTO new_org_id;
    
    -- Add user as admin
    INSERT INTO public.organization_memberships (
      user_id,
      organization_id,
      role,
      is_primary
    ) VALUES (
      user_record.id,
      new_org_id,
      'admin',
      true
    );
    
    RAISE NOTICE 'Created organization % for user % %', 
      new_org_id, user_record.first_name, user_record.last_name;
  END LOOP;
END $$;