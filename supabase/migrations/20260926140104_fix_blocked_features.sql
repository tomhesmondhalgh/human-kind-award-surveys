-- Phase 2 of REMEDIATION_PLAN.md (items 23-24): features that RLS silently blocked.


-- ---------------------------------------------------------------------------
-- Item 23: teammates' names were blank on the Team page
-- ---------------------------------------------------------------------------

-- True when the two users belong to at least one organisation in common.
-- SECURITY DEFINER so the check can read memberships without tripping RLS.
CREATE OR REPLACE FUNCTION public.users_share_organization(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships a
    JOIN public.organization_memberships b ON b.organization_id = a.organization_id
    WHERE a.user_id = user_a AND b.user_id = user_b
  );
$$;

REVOKE EXECUTE ON FUNCTION public.users_share_organization(uuid, uuid) FROM anon, PUBLIC;

-- Users could only read their own profile. Teammates (and platform admins, for
-- the admin and accreditation screens) can now read each other's.
DROP POLICY "profiles_view_own" ON public.profiles;
CREATE POLICY "profiles_view_own_teammates_admins" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.users_share_organization(auth.uid(), id)
    OR public.is_admin(auth.uid())
  );


-- ---------------------------------------------------------------------------
-- Item 24: admin screens
-- ---------------------------------------------------------------------------

-- Granting/revoking platform admin from the Users screen. Admins can't remove
-- their own admin role, so the platform can't be left without one by accident.
CREATE POLICY "user_roles_admin_view_all" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) AND user_id <> auth.uid());

-- Editing billing details from the Purchases screen.
CREATE POLICY "payment_history_admin_update" ON public.payment_history
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- The accreditation review screen: platform admins review submissions from
-- every organisation, not just ones they belong to.
CREATE POLICY "aps_admin_view_all" ON public.action_plan_submissions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "aps_admin_update" ON public.action_plan_submissions
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- The review screen loads submissions with profiles(first_name, ...), but
-- user_id only referenced auth.users, so there was no relationship to follow
-- and the query failed outright. NOT VALID: enforced for new rows without
-- failing on any old submission whose user has no profile.
ALTER TABLE public.action_plan_submissions
  ADD CONSTRAINT action_plan_submissions_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
