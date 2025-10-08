-- Drop the existing public read policy on custom_scripts
DROP POLICY IF EXISTS "custom_scripts_authenticated_read" ON public.custom_scripts;

-- Create new admin-only read policy for custom_scripts table
CREATE POLICY "custom_scripts_admin_read"
ON public.custom_scripts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);