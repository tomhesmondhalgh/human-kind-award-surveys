-- Phase 2: Address Medium Priority Security Issues

-- ============================================================================
-- Step 5: Remove Security Definer View (public_plans)
-- ============================================================================

-- The public_plans view doesn't need SECURITY DEFINER since it only shows
-- active plans which should be publicly accessible anyway.
-- Drop and recreate without SECURITY DEFINER

DROP VIEW IF EXISTS public.public_plans;

-- Recreate as a simple view without SECURITY DEFINER
-- This view allows anyone to see active plans (which is fine for pricing page)
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
FROM plans
WHERE is_active = true;

-- Grant SELECT to anon and authenticated users for public pricing display
GRANT SELECT ON public.public_plans TO anon;
GRANT SELECT ON public.public_plans TO authenticated;

-- Add comment to document purpose
COMMENT ON VIEW public.public_plans IS 'Public view of active subscription plans for pricing page. Does not require SECURITY DEFINER.';

-- ============================================================================
-- Note: Step 6 (Postgres Version Upgrade) requires manual action
-- ============================================================================
-- The Postgres version upgrade cannot be done via migration.
-- User must upgrade via Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard/project/bagaaqkmewkuwtudwnqw/settings/infrastructure
-- 2. Find the Postgres version section
-- 3. Click "Upgrade" to apply security patches
-- 4. Wait for upgrade to complete
-- 5. Test application thoroughly after upgrade