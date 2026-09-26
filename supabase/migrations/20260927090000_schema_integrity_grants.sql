-- Plan item 27 (rest) and the anon EXECUTE clean-up left over from Phase 1.
--
-- A. Schema integrity
--    1. Remove duplicate foreign keys on organization_memberships and
--       organization_invitations (one FK per column).
--    2. survey_responses.survey_template_id becomes NOT NULL, and its FK says
--       ON DELETE RESTRICT out loud: a survey with responses is archived,
--       never deleted.
--    3. Validate action_plan_submissions_user_id_profiles_fkey if no old row
--       breaks it.
-- B. Anonymous visitors lose EXECUTE on every public function except the two
--    that anonymous survey submission needs, and new functions stop being
--    anon-callable by default.
--
-- The whole file runs in one transaction: if any check below fails, nothing
-- in it is applied.


-- ===========================================================================
-- A1. Duplicate foreign keys
-- ===========================================================================
--
-- organization_id (both tables) had two identical FKs to organizations
-- (ON DELETE CASCADE). Keep the conventional *_fkey one.
--
-- user_id / invited_by pointed at BOTH auth.users and profiles (both
-- CASCADE). Keep the profiles one: PostgREST needs it to embed the person's
-- name, and profiles.id itself cascades from auth.users, so deleting a user
-- still removes their memberships and invitations.
--
-- The surviving names all exist today, so code that names them (embed hints)
-- works both before and after this migration.

ALTER TABLE public.organization_memberships
  DROP CONSTRAINT fk_organization_memberships_organization_id,  -- dup of organization_memberships_organization_id_fkey
  DROP CONSTRAINT organization_memberships_user_id_fkey;        -- -> auth.users; fk_organization_memberships_user_id (-> profiles) kept

ALTER TABLE public.organization_invitations
  DROP CONSTRAINT fk_organization_invitations_organization_id,  -- dup of organization_invitations_organization_id_fkey
  DROP CONSTRAINT organization_invitations_invited_by_fkey;     -- -> auth.users; fk_organization_invitations_invited_by (-> profiles) kept


-- ===========================================================================
-- A2. survey_responses.survey_template_id: NOT NULL + ON DELETE RESTRICT
-- ===========================================================================

DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.survey_responses WHERE survey_template_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION
      'Stopped: % survey_responses row(s) have no survey_template_id. Nothing in this migration was applied. Decide what to do with them (e.g. SELECT * FROM public.survey_responses WHERE survey_template_id IS NULL), then run it again.', n;
  END IF;
END
$$;

ALTER TABLE public.survey_responses
  ALTER COLUMN survey_template_id SET NOT NULL;

-- Same behaviour as before (NO ACTION also refused), but RESTRICT states the
-- intent and cannot be deferred.
ALTER TABLE public.survey_responses
  DROP CONSTRAINT survey_responses_survey_template_id_fkey,
  ADD CONSTRAINT survey_responses_survey_template_id_fkey
    FOREIGN KEY (survey_template_id) REFERENCES public.survey_templates(id) ON DELETE RESTRICT;


-- ===========================================================================
-- A3. action_plan_submissions_user_id_profiles_fkey
-- ===========================================================================
--
-- Added NOT VALID in 20260926140104, so it is already enforced for every new
-- or updated row. Validating only adds the guarantee for older rows. An old
-- row can only fail it if its user has an auth account but no profile; that
-- is real accreditation work, not junk to delete, and it shouldn't block the
-- rest of this migration. So: validate when clean, otherwise leave it as it
-- is and say so.

DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n
  FROM public.action_plan_submissions s
  WHERE s.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.user_id);

  IF n = 0 THEN
    ALTER TABLE public.action_plan_submissions
      VALIDATE CONSTRAINT action_plan_submissions_user_id_profiles_fkey;
  ELSE
    RAISE WARNING
      'action_plan_submissions_user_id_profiles_fkey left NOT VALID: % submission(s) belong to users with no profile. New rows are still checked.', n;
  END IF;
END
$$;


-- ===========================================================================
-- B. EXECUTE on public functions
-- ===========================================================================
--
-- Anonymous visitors only ever need two functions, both called by the RLS
-- policies that let a respondent submit a survey (RLS runs policy functions
-- as the querying role, so anon needs EXECUTE on them):
--   is_survey_open                 <- survey_responses  "sr_create_open_surveys" (TO anon, authenticated)
--   can_respond_to_custom_question <- custom_question_responses "cqr_create_validated"
-- Everything else is for signed-in users, edge functions (service_role) or
-- triggers (a trigger function's EXECUTE is not checked when it fires).
--
-- authenticated and service_role already hold explicit grants, so removing
-- PUBLIC does not change what they can call. The loop re-grants them anyway
-- wherever they currently rely on PUBLIC, so nothing they use today breaks.

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid, p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (  -- leave functions that belong to extensions alone
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    IF has_function_privilege('authenticated', f.oid, 'EXECUTE') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
    IF has_function_privilege('service_role', f.oid, 'EXECUTE') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
  END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION public.is_survey_open(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_respond_to_custom_question(uuid, uuid) TO anon;

-- New functions: stop granting anon EXECUTE in public (the baseline set this
-- default), and stop the built-in PUBLIC grant for functions postgres creates.
-- The PUBLIC one has to be database-wide: a per-schema default can only add
-- privileges, never remove the built-in PUBLIC EXECUTE. authenticated and
-- service_role keep their per-schema defaults, so they still get EXECUTE on
-- new functions in public automatically. A future function anon needs must be
-- granted to anon explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;


-- ---------------------------------------------------------------------------
-- Policies that call the now-revoked helpers were created without a role, so
-- they applied to PUBLIC (anon included). For anon they could never pass
-- (every one checks auth.uid(), which is NULL for anon), but Postgres still
-- checks EXECUTE on the functions they call, so an anonymous query on these
-- tables (public_survey_templates, public_plans, ...) would error with
-- "permission denied for function" instead of returning no rows. Scoping them
-- to authenticated keeps anon's result exactly as before: no rows.
-- ---------------------------------------------------------------------------

ALTER POLICY "apd_create_org_editors"   ON public.action_plan_descriptors TO authenticated;
ALTER POLICY "apd_delete_org_admins"    ON public.action_plan_descriptors TO authenticated;
ALTER POLICY "apd_update_org_editors"   ON public.action_plan_descriptors TO authenticated;
ALTER POLICY "apd_view_org_members"     ON public.action_plan_descriptors TO authenticated;

ALTER POLICY "appn_create_org_editors"  ON public.action_plan_progress_notes TO authenticated;
ALTER POLICY "appn_delete_org_editors"  ON public.action_plan_progress_notes TO authenticated;
ALTER POLICY "appn_update_org_editors"  ON public.action_plan_progress_notes TO authenticated;
ALTER POLICY "appn_view_org_members"    ON public.action_plan_progress_notes TO authenticated;

ALTER POLICY "aps_create_org_editors"   ON public.action_plan_submissions TO authenticated;
ALTER POLICY "aps_delete_org_admins"    ON public.action_plan_submissions TO authenticated;
ALTER POLICY "aps_update_org_editors"   ON public.action_plan_submissions TO authenticated;
ALTER POLICY "aps_view_org_members"     ON public.action_plan_submissions TO authenticated;

ALTER POLICY "apt_create_org_editors"   ON public.action_plan_templates TO authenticated;
ALTER POLICY "apt_delete_org_admins"    ON public.action_plan_templates TO authenticated;
ALTER POLICY "apt_update_org_editors"   ON public.action_plan_templates TO authenticated;
ALTER POLICY "apt_view_org_members"     ON public.action_plan_templates TO authenticated;

-- cqr_create_validated stays open to anon (it uses can_respond_to_custom_question).
ALTER POLICY "cqr_delete_org_admins"    ON public.custom_question_responses TO authenticated;
ALTER POLICY "cqr_update_org_editors"   ON public.custom_question_responses TO authenticated;
ALTER POLICY "cqr_view_org_members"     ON public.custom_question_responses TO authenticated;

ALTER POLICY "cq_create_org_editors"    ON public.custom_questions TO authenticated;
ALTER POLICY "cq_delete_org_admins"     ON public.custom_questions TO authenticated;
ALTER POLICY "cq_update_org_editors"    ON public.custom_questions TO authenticated;
ALTER POLICY "cq_view_org_members"      ON public.custom_questions TO authenticated;

ALTER POLICY "org_group_memberships_admin_manage" ON public.organization_group_memberships TO authenticated;

ALTER POLICY "org_invitations_delete_access"    ON public.organization_invitations TO authenticated;
ALTER POLICY "org_invitations_update_access"    ON public.organization_invitations TO authenticated;
ALTER POLICY "org_invitations_view_org_members" ON public.organization_invitations TO authenticated;

ALTER POLICY "om_create_org_admins"     ON public.organization_memberships TO authenticated;
ALTER POLICY "om_delete_org_admins"     ON public.organization_memberships TO authenticated;
ALTER POLICY "om_update_org_admins"     ON public.organization_memberships TO authenticated;
ALTER POLICY "om_view_own_and_admin"    ON public.organization_memberships TO authenticated;

ALTER POLICY "orgs_delete_admins"       ON public.organizations TO authenticated;
ALTER POLICY "orgs_update_admins"       ON public.organizations TO authenticated;
ALTER POLICY "orgs_view_via_invitation" ON public.organizations TO authenticated;

ALTER POLICY "payment_history_admin_view_all" ON public.payment_history TO authenticated;

-- plans_public_read (is_active = true) stays open to everyone.
ALTER POLICY "plans_admin_create"       ON public.plans TO authenticated;
ALTER POLICY "plans_admin_delete"       ON public.plans TO authenticated;
ALTER POLICY "plans_admin_read"         ON public.plans TO authenticated;
ALTER POLICY "plans_admin_update"       ON public.plans TO authenticated;

ALTER POLICY "redemption_codes_admin_all" ON public.redemption_codes TO authenticated;
ALTER POLICY "redemptions_admin_view_all" ON public.redemptions TO authenticated;

ALTER POLICY "sq_create_org_editors"    ON public.survey_questions TO authenticated;
ALTER POLICY "sq_delete_org_editors"    ON public.survey_questions TO authenticated;
ALTER POLICY "sq_update_org_editors"    ON public.survey_questions TO authenticated;
ALTER POLICY "sq_view_org_members"      ON public.survey_questions TO authenticated;

-- sr_create_open_surveys (TO anon, authenticated) stays as it is.
ALTER POLICY "sr_delete_org_admins"     ON public.survey_responses TO authenticated;
ALTER POLICY "sr_update_org_editors"    ON public.survey_responses TO authenticated;
ALTER POLICY "sr_view_org_members"      ON public.survey_responses TO authenticated;

ALTER POLICY "st_create_org_editors"    ON public.survey_templates TO authenticated;
ALTER POLICY "st_delete_org_admins"     ON public.survey_templates TO authenticated;
ALTER POLICY "st_update_org_editors"    ON public.survey_templates TO authenticated;
ALTER POLICY "st_view_org_members"      ON public.survey_templates TO authenticated;


-- ---------------------------------------------------------------------------
-- Safety net: if the live database has any policy anon is subject to that
-- calls a public function anon can no longer execute, stop here (and roll
-- everything back) rather than break anonymous access.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(DISTINCT format('%s on %s calls %s', pol.polname, pol.polrelid::regclass, p.oid::regprocedure), '; ')
  INTO bad
  FROM pg_policy pol
  JOIN pg_depend d ON d.classid = 'pg_policy'::regclass AND d.objid = pol.oid
                  AND d.refclassid = 'pg_proc'::regclass
  JOIN pg_proc p ON p.oid = d.refobjid
  JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
  WHERE (0 = ANY (pol.polroles) OR 'anon'::regrole::oid = ANY (pol.polroles))
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE');

  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Stopped: policies anon is subject to call functions anon cannot execute: %. Nothing in this migration was applied.', bad;
  END IF;
END
$$;
