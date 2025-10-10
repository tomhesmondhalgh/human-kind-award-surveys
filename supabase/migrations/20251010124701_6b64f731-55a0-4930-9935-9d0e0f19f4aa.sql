-- Phase 2 Fix: Add SECURITY INVOKER to public_plans view

-- Drop the view
DROP VIEW IF EXISTS public.public_plans;

-- Recreate with SECURITY INVOKER (recommended by Supabase)
-- This ensures the view respects RLS policies of the querying user
CREATE OR REPLACE VIEW public.public_plans
WITH (security_invoker=on)
AS
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
FROM plans
WHERE is_active = true;

-- Grant SELECT to anon and authenticated users for public pricing display
GRANT SELECT ON public.public_plans TO anon;
GRANT SELECT ON public.public_plans TO authenticated;

-- Add comment to document purpose and security model
COMMENT ON VIEW public.public_plans IS 'Public view of active subscription plans. Uses SECURITY INVOKER to respect RLS policies of querying user.';