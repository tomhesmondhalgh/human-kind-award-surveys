-- Create a public view for plans that excludes sensitive stripe_price_id
CREATE OR REPLACE VIEW public.public_plans AS
SELECT 
  id,
  name,
  description,
  price,
  currency,
  purchase_type,
  duration_months,
  features,
  is_popular,
  is_active,
  sort_order,
  created_at,
  updated_at
FROM public.plans
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.public_plans TO authenticated;
GRANT SELECT ON public.public_plans TO anon;

-- Drop the existing public read policy on plans table
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;

-- Create admin-only read policy for the plans table
CREATE POLICY "plans_admin_read"
ON public.plans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);