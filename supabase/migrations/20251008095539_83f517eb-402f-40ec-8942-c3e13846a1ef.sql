-- Drop the public read policy on custom_scripts table
DROP POLICY IF EXISTS "custom_scripts_read_active" ON public.custom_scripts;

-- Create new policy: only authenticated users can read custom scripts
CREATE POLICY "custom_scripts_authenticated_read" 
ON public.custom_scripts 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Add comment explaining the security decision
COMMENT ON POLICY "custom_scripts_authenticated_read" ON public.custom_scripts IS 
'Restricts custom scripts access to authenticated users only. This prevents unauthorized exposure of potentially sensitive script content, tracking IDs, or API keys embedded in custom scripts.';