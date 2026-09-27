-- Accounts and data integrity (review D1, D2, D7, 1E, plus accreditation
-- self-approval).

-- ---------------------------------------------------------------------------
-- D1: "Create Organisation" failed because the membership insert needs the
-- caller to already be an admin of the new org. Create both in one step.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_address text DEFAULT NULL, p_urn text DEFAULT NULL)
RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  org public.organizations;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(TRIM(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Organisation name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations (name, address, urn)
  VALUES (TRIM(p_name), NULLIF(TRIM(p_address), ''), NULLIF(TRIM(p_urn), ''))
  RETURNING * INTO org;

  -- Primary only if this is the caller's first organisation.
  INSERT INTO public.organization_memberships (user_id, organization_id, role, is_primary)
  VALUES (
    caller, org.id, 'admin',
    NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE user_id = caller)
  );

  RETURN org;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_organization(text, text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text, text) TO authenticated;

-- Orphans left by the old two-step path: organisations with no members at
-- all. Only recent ones (created after 2025-01-01) that nothing else refers
-- to are removed: every public table with an organization_id column, or a
-- foreign key to organizations, must have no row for them.
DO $$
DECLARE
  ref record;
  checks text := '';
  removed integer;
BEGIN
  FOR ref IN
    SELECT DISTINCT table_name, column_name FROM (
      SELECT c.table_name::text, c.column_name::text
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.column_name = 'organization_id'
      UNION
      SELECT cl.relname::text, a.attname::text
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
      WHERE con.contype = 'f' AND con.confrelid = 'public.organizations'::regclass AND n.nspname = 'public'
    ) refs
  LOOP
    checks := checks || format(' AND NOT EXISTS (SELECT 1 FROM public.%I x WHERE x.%I = o.id)', ref.table_name, ref.column_name);
  END LOOP;

  EXECUTE 'DELETE FROM public.organizations o WHERE o.created_at > ''2025-01-01''' || checks;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'accounts_and_data_integrity: removed % orphaned organisation(s) with no members or data', removed;
END;
$$;

-- ---------------------------------------------------------------------------
-- D2: an organisation must always keep an admin (invitations need an admin
-- inviter, and only admins can manage the team).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_org_keeps_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.role <> 'admin' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role = 'admin' AND NEW.organization_id = OLD.organization_id THEN
    RETURN NULL;
  END IF;
  -- Deleting the organisation or the user's account cascades here; allow it.
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = OLD.organization_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.user_id) THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_id = OLD.organization_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'An organisation must keep at least one admin. Make another member an admin first.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_org_keeps_admin() FROM anon, authenticated, PUBLIC;

-- AFTER (not BEFORE) so a statement removing several admins at once is
-- judged on the final state.
DROP TRIGGER IF EXISTS ensure_org_keeps_admin ON public.organization_memberships;
CREATE TRIGGER ensure_org_keeps_admin
  AFTER DELETE OR UPDATE OF role, organization_id ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.ensure_org_keeps_admin();

-- "Leave organisation": members can remove their own membership. Admins
-- already can (om_delete_org_admins); the trigger above stops the last one.
DROP POLICY IF EXISTS "om_delete_own_non_admin" ON public.organization_memberships;
CREATE POLICY "om_delete_own_non_admin" ON public.organization_memberships
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND role <> 'admin');

-- ---------------------------------------------------------------------------
-- D7: deleting a user no longer deletes their organisation's custom
-- questions (and every answer to them). RLS on custom_questions is by
-- organisation role, not creator, so nothing else changes.
-- ---------------------------------------------------------------------------

ALTER TABLE public.custom_questions ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE public.custom_questions DROP CONSTRAINT custom_questions_creator_id_fkey;
ALTER TABLE public.custom_questions
  ADD CONSTRAINT custom_questions_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 1E clean-ups
-- ---------------------------------------------------------------------------

-- Let any user pre-insert a redemption row for any code; redeem_code (service
-- role) is the only writer now.
DROP POLICY IF EXISTS "redemptions_create_own" ON public.redemptions;

-- Queried a column that doesn't exist; nothing calls it.
DROP FUNCTION IF EXISTS public.count_email_responses(uuid);

-- ---------------------------------------------------------------------------
-- Accreditation: a school could approve its own submission (org editors could
-- insert with any status and update any column). Schools may only submit;
-- review fields are for platform admins.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "aps_update_org_editors" ON public.action_plan_submissions;

DROP POLICY IF EXISTS "aps_create_org_editors" ON public.action_plan_submissions;
CREATE POLICY "aps_create_org_editors" ON public.action_plan_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_organization_role(auth.uid(), organization_id, 'editor')
    AND user_id = auth.uid()
    AND status = 'submitted'
    AND reviewed_at IS NULL
    AND approved_at IS NULL
    AND reviewer_notes IS NULL
    AND next_submission_due IS NULL
  );

-- Belt and braces, since RLS can't restrict individual columns: only
-- platform admins (or server-side code with no user) may set review fields.
CREATE OR REPLACE FUNCTION public.guard_accreditation_review_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'submitted' OR NEW.reviewed_at IS NOT NULL OR NEW.approved_at IS NOT NULL
       OR NEW.reviewer_notes IS NOT NULL OR NEW.next_submission_due IS NOT NULL THEN
      RAISE EXCEPTION 'Only Human Kind reviewers can set a submission''s review status' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.next_submission_due IS DISTINCT FROM OLD.next_submission_due THEN
    RAISE EXCEPTION 'Only Human Kind reviewers can change a submission''s review status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_accreditation_review_fields() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS guard_accreditation_review_fields ON public.action_plan_submissions;
CREATE TRIGGER guard_accreditation_review_fields
  BEFORE INSERT OR UPDATE ON public.action_plan_submissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_accreditation_review_fields();
