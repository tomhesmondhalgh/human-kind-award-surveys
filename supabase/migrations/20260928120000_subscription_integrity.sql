-- Subscription integrity (review A1-A4).
--
-- 1. get_user_subscription used to return the newest row whatever its status,
--    so an abandoned checkout (a 'pending' row) hid a paying school's plan.
--    It now prefers an active, in-date row and only falls back to the newest
--    row when there is none. Signature, auth check and grants are unchanged
--    (CREATE OR REPLACE keeps the existing EXECUTE grants).
-- 2. One-off tidy-up of pending rows left behind by abandoned checkouts for
--    users who already have an active plan.

CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid uuid)
RETURNS TABLE(plan public.plan_type, is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_uuid AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT s.plan_type AS plan,
         (s.status = 'active' AND (s.end_date IS NULL OR s.end_date > NOW())) AS is_active
  FROM public.subscriptions s
  WHERE s.user_id = user_uuid
  ORDER BY (s.status = 'active' AND (s.end_date IS NULL OR s.end_date > NOW())) DESC,
           s.created_at DESC
  LIMIT 1;
END;
$$;

-- Stale pending rows: created after the user's active, in-date plan began,
-- for users who have such a plan. Pending rows that still carry an
-- outstanding invoice (payment_history pending / invoice_raised) are left
-- alone so admins can still mark those invoices paid. Safe to re-run.
DO $$
DECLARE
  cancelled_count integer;
BEGIN
  WITH active_plan AS (
    SELECT user_id, min(created_at) AS first_active_at
    FROM public.subscriptions
    WHERE status = 'active' AND (end_date IS NULL OR end_date > now())
    GROUP BY user_id
  )
  UPDATE public.subscriptions s
  SET status = 'canceled', updated_at = now()
  FROM active_plan a
  WHERE s.user_id = a.user_id
    AND s.status = 'pending'
    AND s.created_at > a.first_active_at
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_history ph
      WHERE ph.subscription_id = s.id
        AND ph.payment_status IN ('pending', 'invoice_raised')
    );
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RAISE NOTICE 'subscription_integrity: cancelled % stale pending subscription row(s)', cancelled_count;
END;
$$;
