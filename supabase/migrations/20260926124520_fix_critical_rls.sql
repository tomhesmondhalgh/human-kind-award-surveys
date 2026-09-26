-- Phase 1A of REMEDIATION_PLAN.md: close the critical RLS and SECURITY DEFINER holes
-- found in the 2026-09-26 review. Items reference the plan's numbering.


-- ---------------------------------------------------------------------------
-- Item 1: org-takeover chain
-- ---------------------------------------------------------------------------

-- Only org admins may create invitations, and only in their own name.
DROP POLICY "org_invitations_create_authenticated" ON public.organization_invitations;
CREATE POLICY "org_invitations_create_org_admins" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_manage_org_membership(auth.uid(), organization_id)
    AND invited_by = auth.uid()
  );

-- Accepting now requires: the caller is the user being added (when called with a
-- session), and the inviter is still an admin of the org, so invitations written
-- through the old open policy can't be redeemed.
CREATE OR REPLACE FUNCTION public.accept_invitation_during_signup(user_uuid uuid, invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record RECORD;
  user_email TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_uuid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorised');
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  IF user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT * INTO invitation_record
  FROM public.organization_invitations
  WHERE token = invitation_token;

  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF LOWER(invitation_record.email) <> LOWER(user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation email does not match user email');
  END IF;

  IF NOT public.user_can_manage_org_membership(invitation_record.invited_by, invitation_record.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation is no longer valid');
  END IF;

  IF invitation_record.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_accepted', true, 'message', 'Invitation already accepted');
  END IF;

  IF invitation_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = user_uuid AND organization_id = invitation_record.organization_id
  ) THEN
    UPDATE public.organization_invitations SET accepted_at = NOW() WHERE id = invitation_record.id;
    RETURN jsonb_build_object('success', true, 'already_member', true, 'message', 'Already a member of this organisation');
  END IF;

  INSERT INTO public.organization_memberships (user_id, organization_id, role, is_primary)
  VALUES (user_uuid, invitation_record.organization_id, invitation_record.role, false);

  UPDATE public.organization_invitations SET accepted_at = NOW() WHERE id = invitation_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'role', invitation_record.role,
    'message', 'Successfully joined organisation'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Signup now accepts invitations inside handle_new_user, so this is only called
-- by logged-in users (Login.tsx after email confirmation).
REVOKE EXECUTE ON FUNCTION public.accept_invitation_during_signup(uuid, text) FROM anon, PUBLIC;


-- ---------------------------------------------------------------------------
-- Item 2: invitation email/token leak
-- ---------------------------------------------------------------------------

-- Drops the branch that matched every pending invitation for everyone. Invitees
-- preview invitations through the get-invitation-details edge function. The email
-- comes from the JWT: the old version read auth.users, which the authenticated
-- role can't select from.
DROP POLICY "org_invitations_view_org_members" ON public.organization_invitations;
CREATE POLICY "org_invitations_view_org_members" ON public.organization_invitations
  FOR SELECT USING (
    public.user_is_organization_member(auth.uid(), organization_id)
    OR (auth.uid() IS NOT NULL AND LOWER(email) = LOWER(auth.jwt() ->> 'email'))
  );

DROP POLICY "orgs_view_via_invitation" ON public.organizations;
CREATE POLICY "orgs_view_via_invitation" ON public.organizations
  FOR SELECT USING (
    public.user_is_organization_member(auth.uid(), id)
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_invitations i
      WHERE i.organization_id = organizations.id
        AND i.accepted_at IS NULL
        AND i.expires_at > now()
        AND LOWER(i.email) = LOWER(auth.jwt() ->> 'email')
    ))
  );


-- ---------------------------------------------------------------------------
-- Item 3: SECURITY DEFINER functions trusting a caller-supplied user id
-- ---------------------------------------------------------------------------

-- Callers may only ask about themselves, unless they are a platform admin.
-- auth.uid() is NULL for the service role (edge functions); anon loses EXECUTE below.
CREATE OR REPLACE FUNCTION public.get_user_memberships(user_uuid uuid)
RETURNS SETOF public.organization_memberships
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_uuid AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.organization_memberships WHERE user_id = user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid)
RETURNS TABLE(id uuid, name text, address text, urn text, created_at timestamp with time zone, updated_at timestamp with time zone, role public.organization_role)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_uuid AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT o.id, o.name, o.address, o.urn, o.created_at, o.updated_at, om.role
  FROM public.organizations o
  JOIN public.organization_memberships om ON o.id = om.organization_id
  WHERE om.user_id = user_uuid;
END;
$$;

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
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_profile(profile_id uuid, profile_first_name text, profile_last_name text, profile_job_title text, profile_school_name text, profile_school_address text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> profile_id THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.profiles (id, first_name, last_name, job_title, school_name, school_address)
  VALUES (profile_id, profile_first_name, profile_last_name, profile_job_title, profile_school_name, profile_school_address)
  ON CONFLICT (id) DO UPDATE SET
    first_name = profile_first_name,
    last_name = profile_last_name,
    job_title = profile_job_title,
    school_name = profile_school_name,
    school_address = profile_school_address,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_memberships(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_organizations(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_or_update_profile(uuid, text, text, text, text, text) FROM anon, PUBLIC;
-- Only handle_new_user creates organisations at signup now.
REVOKE EXECUTE ON FUNCTION public.setup_user_organization(uuid, text, text, text) FROM anon, authenticated, PUBLIC;


-- ---------------------------------------------------------------------------
-- Items 3 + 9: signup work moves into the auth.users trigger
-- ---------------------------------------------------------------------------

-- The frontend passes everything in signUp() metadata:
--   first_name, last_name, job_title, school_name, school_address  -> profile
--   org_name, org_address, org_urn                                 -> new org, user as admin
--   invitation_token                                               -> join the invited org
-- Profile and invitation problems never block signup (the invitation can still be
-- accepted after login). Organisation creation does: an account without an
-- organisation is unusable, so it's better for signup to fail cleanly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  new_org_id uuid;
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, job_title, school_name, school_address)
    VALUES (NEW.id, meta->>'first_name', meta->>'last_name', meta->>'job_title', meta->>'school_name', meta->>'school_address')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  IF NULLIF(TRIM(meta->>'org_name'), '') IS NOT NULL THEN
    INSERT INTO public.organizations (name, address, urn)
    VALUES (TRIM(meta->>'org_name'), NULLIF(meta->>'org_address', ''), NULLIF(meta->>'org_urn', ''))
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_memberships (user_id, organization_id, role, is_primary)
    VALUES (NEW.id, new_org_id, 'admin', true);
  END IF;

  IF NULLIF(meta->>'invitation_token', '') IS NOT NULL THEN
    BEGIN
      PERFORM public.accept_invitation_during_signup(NEW.id, meta->>'invitation_token');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: invitation accept failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- Item 4: redeem_code validates the code itself and ignores the caller's plan
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.redeem_code(user_uuid uuid, code_uuid uuid, plan public.plan_type)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_plan public.plan_type;
  new_subscription_id uuid;
BEGIN
  -- The `plan` argument is kept for signature compatibility and ignored:
  -- the plan always comes from the code.
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: Cannot redeem code for another user' USING ERRCODE = '42501';
  END IF;

  -- Atomic claim: only succeeds if the code is active, unexpired and has uses left.
  UPDATE public.redemption_codes
  SET current_uses = COALESCE(current_uses, 0) + 1, updated_at = now()
  WHERE id = code_uuid
    AND is_active
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
  RETURNING plan_type INTO code_plan;

  IF code_plan IS NULL THEN
    RAISE EXCEPTION 'Redemption code is invalid, expired or fully used' USING ERRCODE = 'P0001';
  END IF;

  -- Unique (code_id, user_id) stops the same user redeeming twice; the whole
  -- function rolls back (including the use count) if it fires.
  INSERT INTO public.redemptions (code_id, user_id) VALUES (code_uuid, user_uuid);

  INSERT INTO public.subscriptions (user_id, plan_type, status, payment_method, start_date, purchase_type)
  VALUES (user_uuid, code_plan, 'active', 'redemption_code', now(), 'subscription')
  RETURNING id INTO new_subscription_id;

  RETURN jsonb_build_object('success', true, 'subscription_id', new_subscription_id, 'message', 'Code redeemed successfully');
END;
$$;

-- Only the verify-redemption-code edge function (service role) calls this.
REVOKE EXECUTE ON FUNCTION public.redeem_code(uuid, uuid, public.plan_type) FROM anon, authenticated, PUBLIC;


-- ---------------------------------------------------------------------------
-- Item 5: survey responses can only go into open surveys
-- ---------------------------------------------------------------------------

DROP POLICY "sr_create_public" ON public.survey_responses;
CREATE POLICY "sr_create_open_surveys" ON public.survey_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_survey_open(survey_template_id));

REVOKE INSERT ON public.survey_responses FROM PUBLIC;

-- The question must be attached to the survey being answered, and that survey must be open.
CREATE OR REPLACE FUNCTION public.can_respond_to_custom_question(question_uuid uuid, response_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.survey_responses r
    JOIN public.survey_questions sq ON sq.survey_id = r.survey_template_id AND sq.question_id = question_uuid
    WHERE r.id = response_uuid
      AND public.is_survey_open(r.survey_template_id)
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- Items 6 + 8: global custom questions and response write access
-- ---------------------------------------------------------------------------

-- Global (organization_id IS NULL) questions: platform admins only.
DROP POLICY "cq_create_org_editors" ON public.custom_questions;
CREATE POLICY "cq_create_org_editors" ON public.custom_questions
  FOR INSERT WITH CHECK (
    CASE WHEN organization_id IS NULL THEN public.is_admin(auth.uid())
         ELSE public.user_has_organization_role(auth.uid(), organization_id, 'editor') END
  );

DROP POLICY "cq_update_org_editors" ON public.custom_questions;
CREATE POLICY "cq_update_org_editors" ON public.custom_questions
  FOR UPDATE USING (
    CASE WHEN organization_id IS NULL THEN public.is_admin(auth.uid())
         ELSE public.user_has_organization_role(auth.uid(), organization_id, 'editor') END
  );

DROP POLICY "cq_delete_org_admins" ON public.custom_questions;
CREATE POLICY "cq_delete_org_admins" ON public.custom_questions
  FOR DELETE USING (
    CASE WHEN organization_id IS NULL THEN public.is_admin(auth.uid())
         ELSE public.user_has_organization_role(auth.uid(), organization_id, 'admin') END
  );

-- Role on the organisation that owns a survey.
CREATE OR REPLACE FUNCTION public.user_has_survey_template_role(user_uuid uuid, template_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT public.user_has_organization_role(user_uuid, t.organization_id, required_role)
    FROM public.survey_templates t
    WHERE t.id = template_id
  ), false);
$$;

-- Role on the organisation whose survey a response belongs to.
CREATE OR REPLACE FUNCTION public.user_has_survey_response_role(user_uuid uuid, response_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT public.user_has_survey_template_role(user_uuid, r.survey_template_id, required_role)
    FROM public.survey_responses r
    WHERE r.id = response_uuid
  ), false);
$$;

-- Policy names said editor/admin but the checks were membership-only.
DROP POLICY "sr_update_org_editors" ON public.survey_responses;
CREATE POLICY "sr_update_org_editors" ON public.survey_responses
  FOR UPDATE USING (public.user_has_survey_template_role(auth.uid(), survey_template_id, 'editor'));

DROP POLICY "sr_delete_org_admins" ON public.survey_responses;
CREATE POLICY "sr_delete_org_admins" ON public.survey_responses
  FOR DELETE USING (public.user_has_survey_template_role(auth.uid(), survey_template_id, 'admin'));

-- Custom-question answers are scoped by the survey they were given in, not by the
-- question's organisation. That's what stopped answers to global questions being
-- readable by everyone.
DROP POLICY "cqr_view_org_members" ON public.custom_question_responses;
CREATE POLICY "cqr_view_org_members" ON public.custom_question_responses
  FOR SELECT USING (public.user_has_survey_response_role(auth.uid(), response_id, 'viewer'));

DROP POLICY "cqr_update_org_editors" ON public.custom_question_responses;
CREATE POLICY "cqr_update_org_editors" ON public.custom_question_responses
  FOR UPDATE USING (public.user_has_survey_response_role(auth.uid(), response_id, 'editor'));

DROP POLICY "cqr_delete_org_admins" ON public.custom_question_responses;
CREATE POLICY "cqr_delete_org_admins" ON public.custom_question_responses
  FOR DELETE USING (public.user_has_survey_response_role(auth.uid(), response_id, 'admin'));

-- No longer used by any policy; kept (fixed) in case anything else calls it.
CREATE OR REPLACE FUNCTION public.user_can_access_custom_question_response(user_uuid uuid, question_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.custom_questions WHERE id = question_uuid;
  IF org_id IS NULL THEN
    RETURN public.is_admin(user_uuid);
  END IF;
  RETURN public.user_is_organization_member(user_uuid, org_id);
END;
$$;


-- ---------------------------------------------------------------------------
-- Item 7: unused, broken and unauthenticated
-- ---------------------------------------------------------------------------

DROP FUNCTION public.create_invitation_with_role(text, uuid, text, text, uuid, timestamp with time zone);
