-- Fix 1: Admin Role Security - Remove profiles.is_admin and update all RLS policies

-- ============================================================================
-- STEP 1: Update RLS Policies to use is_admin() function instead of profiles.is_admin
-- ============================================================================

-- Custom Scripts policies
DROP POLICY IF EXISTS "custom_scripts_admin_all" ON public.custom_scripts;
DROP POLICY IF EXISTS "custom_scripts_admin_read" ON public.custom_scripts;

CREATE POLICY "custom_scripts_admin_all" 
ON public.custom_scripts 
FOR ALL 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "custom_scripts_admin_read" 
ON public.custom_scripts 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Plans policies
DROP POLICY IF EXISTS "plans_admin_create" ON public.plans;
DROP POLICY IF EXISTS "plans_admin_delete" ON public.plans;
DROP POLICY IF EXISTS "plans_admin_read" ON public.plans;
DROP POLICY IF EXISTS "plans_admin_update" ON public.plans;

CREATE POLICY "plans_admin_create" 
ON public.plans 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "plans_admin_delete" 
ON public.plans 
FOR DELETE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "plans_admin_read" 
ON public.plans 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "plans_admin_update" 
ON public.plans 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Payment History policies
DROP POLICY IF EXISTS "payment_history_admin_view_all" ON public.payment_history;

CREATE POLICY "payment_history_admin_view_all" 
ON public.payment_history 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Redemption Codes policies
DROP POLICY IF EXISTS "redemption_codes_admin_all" ON public.redemption_codes;

CREATE POLICY "redemption_codes_admin_all" 
ON public.redemption_codes 
FOR ALL 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Redemptions policies
DROP POLICY IF EXISTS "redemptions_admin_view_all" ON public.redemptions;

CREATE POLICY "redemptions_admin_view_all" 
ON public.redemptions 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- STEP 2: Update admin_get_all_payments function to use user_roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_all_payments()
RETURNS TABLE(
  id uuid,
  subscription_id uuid,
  amount numeric,
  payment_date timestamp with time zone,
  payment_method payment_method,
  created_at timestamp with time zone,
  payment_status payment_status,
  invoice_number text,
  invoice_id text,
  billing_postcode text,
  billing_address text,
  billing_school_name text,
  billing_contact_email text,
  billing_contact_name text,
  stripe_payment_id text,
  currency text,
  plan_type text,
  purchase_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if the current user has admin role using user_roles table
  IF public.is_admin(auth.uid()) THEN
    RETURN QUERY
    SELECT 
      ph.id,
      ph.subscription_id,
      ph.amount,
      ph.payment_date,
      ph.payment_method,
      ph.created_at,
      ph.payment_status,
      ph.invoice_number,
      ph.invoice_id,
      ph.billing_postcode,
      ph.billing_address,
      ph.billing_school_name,
      ph.billing_contact_email,
      ph.billing_contact_name,
      ph.stripe_payment_id,
      ph.currency,
      s.plan_type::text,
      s.purchase_type
    FROM 
      public.payment_history ph
    LEFT JOIN 
      public.subscriptions s ON ph.subscription_id = s.id
    ORDER BY 
      ph.created_at DESC;
  ELSE
    -- If not admin, return empty result
    RETURN QUERY SELECT 
      NULL::uuid, NULL::uuid, NULL::numeric, 
      NULL::timestamp with time zone, NULL::payment_method, 
      NULL::timestamp with time zone, NULL::payment_status,
      NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, 
      NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text
    WHERE false;
  END IF;
END
$function$;

-- ============================================================================
-- STEP 3: Drop the vulnerable profiles.is_admin column
-- ============================================================================

-- WARNING: This is a breaking change for any code still referencing profiles.is_admin
-- All admin checks now MUST use the is_admin() function or query user_roles directly

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;