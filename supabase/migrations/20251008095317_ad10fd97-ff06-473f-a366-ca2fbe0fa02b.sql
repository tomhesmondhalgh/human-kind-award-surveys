-- Drop the existing public read policy on schools table
DROP POLICY IF EXISTS "schools_public_read" ON public.schools;

-- Create new policy: only authenticated users can search schools
CREATE POLICY "schools_authenticated_read" 
ON public.schools 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add comment explaining the security decision
COMMENT ON POLICY "schools_authenticated_read" ON public.schools IS 
'Restricts school data access to authenticated users only to prevent scraping and unauthorized data exposure. The schools table contains PII including head teacher names, phone numbers, and addresses.';