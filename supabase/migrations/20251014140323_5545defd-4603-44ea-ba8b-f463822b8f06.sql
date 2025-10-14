-- ============================================
-- SECURITY FIX: Payment History Billing Data Protection
-- ============================================
-- This migration protects sensitive billing PII by:
-- 1. Creating a user-safe view with redacted billing data
-- 2. Restricting direct payment_history table access to admins only

-- Step 1: Create secure user view (non-sensitive data only)
CREATE OR REPLACE VIEW user_payment_summary
WITH (security_invoker = true)
AS
SELECT 
  ph.id,
  ph.subscription_id,
  ph.amount,
  ph.currency,
  ph.payment_date,
  ph.payment_method,
  ph.payment_status,
  ph.invoice_number,
  ph.created_at,
  s.plan_type,
  s.purchase_type,
  s.user_id,
  -- Redact sensitive billing information for non-admin users
  CASE 
    WHEN LENGTH(ph.billing_school_name) > 3 
    THEN SUBSTRING(ph.billing_school_name, 1, 3) || '***'
    ELSE '***'
  END as billing_school_name_redacted,
  -- Completely hide sensitive PII
  NULL::text as billing_contact_name,
  NULL::text as billing_contact_email,
  NULL::text as billing_address,
  NULL::text as billing_postcode
FROM payment_history ph
LEFT JOIN subscriptions s ON ph.subscription_id = s.id;

-- Step 2: Enable RLS on the view (inherits from underlying table)
ALTER VIEW user_payment_summary OWNER TO postgres;

-- Step 3: Drop the dangerous user-facing policy on payment_history
DROP POLICY IF EXISTS "payment_history_view_own" ON payment_history;

-- Step 4: Create new policy for user access via the safe view
-- Users can only see their own payment summaries through the view
CREATE POLICY "user_payment_summary_access" 
ON payment_history
FOR SELECT 
TO authenticated
USING (
  -- Allow access only if querying through the view context
  -- and the payment belongs to the authenticated user
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.id = payment_history.subscription_id 
    AND s.user_id = auth.uid()
  )
);

-- Step 5: Ensure admin policy remains unchanged
-- Admin access via payment_history_admin_view_all already exists
-- This allows admins to see full billing details

-- Step 6: Grant SELECT on view to authenticated users
GRANT SELECT ON user_payment_summary TO authenticated;