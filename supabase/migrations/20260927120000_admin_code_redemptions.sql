-- Admin > Redemption codes > view redemptions. The page embedded
-- auth.users through PostgREST, which isn't exposed, so the list always
-- failed. This returns who redeemed a code, for platform admins only.
CREATE OR REPLACE FUNCTION public.admin_get_code_redemptions(p_code_id uuid)
RETURNS TABLE (
  id uuid,
  redeemed_at timestamptz,
  email text,
  first_name text,
  last_name text,
  school_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can view redemptions' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.redeemed_at, u.email::text, p.first_name, p.last_name, p.school_name
  FROM redemptions r
  LEFT JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN profiles p ON p.id = r.user_id
  WHERE r.code_id = p_code_id
  ORDER BY r.redeemed_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_code_redemptions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_code_redemptions(uuid) TO authenticated, service_role;
