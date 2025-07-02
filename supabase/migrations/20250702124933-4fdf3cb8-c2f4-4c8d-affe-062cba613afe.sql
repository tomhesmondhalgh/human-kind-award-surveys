-- Replace the problematic RLS policy that relies on auth.uid() during INSERT
-- with a simpler one that allows INSERTs and checks permissions at application level

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "org_invitations_create_access" ON organization_invitations;

-- Create a new policy that allows authenticated users to insert invitations
-- Permission checking will be done at application level before the INSERT
CREATE POLICY "org_invitations_create_authenticated" 
ON organization_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (invited_by IS NOT NULL);

-- Keep the existing view/update/delete policies as they work fine
-- (they don't have the same JWT context issues)