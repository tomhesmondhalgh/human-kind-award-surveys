-- Allow public read access to plans table so pricing cards display on the upgrade page
-- The public_plans view inherits this policy from the underlying plans table
CREATE POLICY "plans_public_read"
ON plans
FOR SELECT
TO public
USING (is_active = true);