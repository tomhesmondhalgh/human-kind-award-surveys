
-- Step 1: Add policy to allow public read access for active custom scripts
CREATE POLICY "custom_scripts_read_active" 
  ON public.custom_scripts 
  FOR SELECT 
  USING (is_active = true);
