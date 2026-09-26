-- Baseline schema, dumped from the live database on 2026-09-26.
-- Replaces the migrations Lovable generated, which did not match the
-- database's migration history. Earlier history is in git.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."accreditation_status" AS ENUM (
    'not_submitted',
    'submitted',
    'under_review',
    'approved',
    'rejected'
);


ALTER TYPE "public"."accreditation_status" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."descriptor_status" AS ENUM (
    'Not Started',
    'In Progress',
    'Blocked',
    'Completed',
    'Not Applicable'
);


ALTER TYPE "public"."descriptor_status" OWNER TO "postgres";


CREATE TYPE "public"."organization_role" AS ENUM (
    'admin',
    'editor',
    'viewer'
);


ALTER TYPE "public"."organization_role" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'stripe',
    'invoice',
    'manual',
    'redemption_code'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'invoice_raised',
    'payment_made',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."plan_type" AS ENUM (
    'free',
    'foundation',
    'progress',
    'premium',
    'legacy'
);


ALTER TYPE "public"."plan_type" OWNER TO "postgres";


CREATE TYPE "public"."role_hierarchy_level" AS ENUM (
    'system',
    'group',
    'organization',
    'standard'
);


ALTER TYPE "public"."role_hierarchy_level" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'canceled',
    'expired',
    'pending'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."survey_status" AS ENUM (
    'Saved',
    'Scheduled',
    'Sent',
    'Completed',
    'Archived'
);


ALTER TYPE "public"."survey_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation_during_signup"("user_uuid" "uuid", "invitation_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invitation_record RECORD;
  user_email TEXT;
  result JSONB;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get invitation
  SELECT * INTO invitation_record
  FROM public.organization_invitations
  WHERE token = invitation_token;
  
  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found'
    );
  END IF;
  
  -- Security: Verify invitation email matches user email
  IF LOWER(invitation_record.email) != LOWER(user_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation email does not match user email'
    );
  END IF;
  
  -- Check if already accepted
  IF invitation_record.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'message', 'Invitation already accepted'
    );
  END IF;
  
  -- Check if expired
  IF invitation_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation has expired'
    );
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = user_uuid
    AND organization_id = invitation_record.organization_id
  ) THEN
    -- Mark invitation as accepted and return success
    UPDATE public.organization_invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'message', 'Already a member of this organisation'
    );
  END IF;
  
  -- Create membership
  INSERT INTO public.organization_memberships (
    user_id,
    organization_id,
    role,
    is_primary
  ) VALUES (
    user_uuid,
    invitation_record.organization_id,
    invitation_record.role,
    false
  );
  
  -- Mark invitation as accepted
  UPDATE public.organization_invitations
  SET accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'role', invitation_record.role,
    'message', 'Successfully joined organisation'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."accept_invitation_during_signup"("user_uuid" "uuid", "invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_all_payments"() RETURNS TABLE("id" "uuid", "subscription_id" "uuid", "amount" numeric, "payment_date" timestamp with time zone, "payment_method" "public"."payment_method", "created_at" timestamp with time zone, "payment_status" "public"."payment_status", "invoice_number" "text", "invoice_id" "text", "billing_postcode" "text", "billing_address" "text", "billing_school_name" "text", "billing_contact_email" "text", "billing_contact_name" "text", "stripe_payment_id" "text", "currency" "text", "plan_type" "text", "purchase_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_get_all_payments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_respond_to_custom_question"("question_uuid" "uuid", "response_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  survey_id uuid;
  survey_is_open boolean;
BEGIN
  -- Get the survey_template_id from the response
  SELECT survey_template_id INTO survey_id
  FROM public.survey_responses
  WHERE id = response_uuid;
  
  -- If no survey found, deny access
  IF survey_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the survey is open (status = 'Sent' and close_date is null or in future)
  SELECT (
    status = 'Sent' AND 
    (close_date IS NULL OR close_date > now())
  ) INTO survey_is_open
  FROM public.survey_templates
  WHERE id = survey_id;
  
  -- Return true if survey is open
  RETURN COALESCE(survey_is_open, false);
END;
$$;


ALTER FUNCTION "public"."can_respond_to_custom_question"("question_uuid" "uuid", "response_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_email_responses"("survey_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  email_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO email_count
  FROM survey_responses
  WHERE survey_template_id = survey_id
  AND response_type = 'email';
  
  RETURN email_count;
END;
$$;


ALTER FUNCTION "public"."count_email_responses"("survey_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_survey_responses"("survey_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  response_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO response_count
  FROM survey_responses
  WHERE survey_template_id = survey_id;
  
  RETURN response_count;
END;
$$;


ALTER FUNCTION "public"."count_survey_responses"("survey_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation_with_role"("user_email" "text", "org_id" "uuid", "role_str" "text", "invitation_token" "text", "inviter_id" "uuid", "expiry_date" timestamp with time zone) RETURNS TABLE("invitation_id" "uuid", "recipient_email" "text", "org_uuid" "uuid", "creation_date" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_invitation_id UUID;
  new_created_at TIMESTAMP WITH TIME ZONE;
  role_enum user_role_type;
BEGIN
  -- Convert text role to user_role_type enum
  IF role_str = 'organization_admin' THEN
    role_enum := 'organization_admin'::user_role_type;
  ELSIF role_str = 'editor' THEN
    role_enum := 'editor'::user_role_type;
  ELSIF role_str = 'viewer' THEN
    role_enum := 'viewer'::user_role_type;
  ELSE
    RAISE EXCEPTION 'Invalid role: %', role_str;
  END IF;

  -- Insert the invitation with the converted enum
  INSERT INTO public.invitations (
    email,
    organization_id,
    role,
    token,
    invited_by,
    expires_at
  ) VALUES (
    user_email,
    org_id,
    role_enum,
    invitation_token,
    inviter_id,
    expiry_date
  )
  RETURNING invitations.id, invitations.email, invitations.organization_id, invitations.created_at 
  INTO new_invitation_id, user_email, org_id, new_created_at;

  -- Return the newly created invitation with renamed columns to avoid ambiguity
  RETURN QUERY SELECT 
    new_invitation_id as invitation_id,
    user_email as recipient_email,
    org_id as org_uuid,
    new_created_at as creation_date;
END;
$$;


ALTER FUNCTION "public"."create_invitation_with_role"("user_email" "text", "org_id" "uuid", "role_str" "text", "invitation_token" "text", "inviter_id" "uuid", "expiry_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_or_update_profile"("profile_id" "uuid", "profile_first_name" "text", "profile_last_name" "text", "profile_job_title" "text", "profile_school_name" "text", "profile_school_address" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert the profile if it doesn't exist, otherwise update it
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    job_title,
    school_name,
    school_address
  ) 
  VALUES (
    profile_id,
    profile_first_name,
    profile_last_name,
    profile_job_title,
    profile_school_name,
    profile_school_address
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = profile_first_name,
    last_name = profile_last_name,
    job_title = profile_job_title,
    school_name = profile_school_name,
    school_address = profile_school_address,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."create_or_update_profile"("profile_id" "uuid", "profile_first_name" "text", "profile_last_name" "text", "profile_job_title" "text", "profile_school_name" "text", "profile_school_address" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_or_update_profile"("profile_id" "uuid", "profile_first_name" "text", "profile_last_name" "text", "profile_job_title" "text", "profile_school_name" "text", "profile_school_address" "text") IS 'Creates or updates a profile, bypassing RLS to be used during user onboarding';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."organization_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "public"."organization_role" DEFAULT 'viewer'::"public"."organization_role" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_memberships" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_memberships"("user_uuid" "uuid") RETURNS SETOF "public"."organization_memberships"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT * FROM public.organization_memberships 
  WHERE user_id = user_uuid;
$$;


ALTER FUNCTION "public"."get_user_memberships"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "address" "text", "urn" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "role" "public"."organization_role")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Add logging to help debug
  RAISE LOG 'get_user_organizations called for user: %', user_uuid;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.address,
    o.urn,
    o.created_at,
    o.updated_at,
    om.role
  FROM 
    public.organizations o
  INNER JOIN 
    public.organization_memberships om ON o.id = om.organization_id
  WHERE 
    om.user_id = user_uuid;
    
  RAISE LOG 'get_user_organizations returning % rows', (SELECT COUNT(*) FROM public.organization_memberships WHERE user_id = user_uuid);
END;
$$;


ALTER FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription"("user_uuid" "uuid") RETURNS TABLE("plan" "public"."plan_type", "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.plan_type as plan,
    (s.status = 'active' AND (s.end_date IS NULL OR s.end_date > NOW())) as is_active
  FROM 
    public.subscriptions s
  WHERE 
    s.user_id = user_uuid
  ORDER BY 
    s.created_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_subscription"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    job_title,
    school_name,
    school_address
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'job_title',
    NEW.raw_user_meta_data->>'school_name',
    NEW.raw_user_meta_data->>'school_address'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") IS 'Security definer function to check if user has specific role, prevents RLS recursion';



CREATE OR REPLACE FUNCTION "public"."is_admin"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;


ALTER FUNCTION "public"."is_admin"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"("_user_id" "uuid") IS 'Convenience function to check admin status using security definer pattern';



CREATE OR REPLACE FUNCTION "public"."is_owner"("record_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN auth.uid() = record_user_id;
END;
$$;


ALTER FUNCTION "public"."is_owner"("record_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_survey_open"("survey_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM survey_templates
    WHERE id = survey_id
    AND status = 'Sent'
    AND (close_date IS NULL OR close_date > now())
  );
END;
$$;


ALTER FUNCTION "public"."is_survey_open"("survey_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_code"("user_uuid" "uuid", "code_uuid" "uuid", "plan" "public"."plan_type") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSONB;
  subscription_id UUID;
BEGIN
  -- SECURITY: Validate that user can only redeem codes for themselves
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot redeem code for another user'
      USING ERRCODE = '42501';
  END IF;
  
  -- Start a transaction
  BEGIN
    -- Create a redemption record
    INSERT INTO public.redemptions (code_id, user_id)
    VALUES (code_uuid, user_uuid);
    
    -- Update the code usage count
    UPDATE public.redemption_codes
    SET current_uses = current_uses + 1
    WHERE id = code_uuid;
    
    -- Create a new subscription for the user with the plan from the code
    INSERT INTO public.subscriptions (
      user_id,
      plan_type,
      status,
      payment_method,
      start_date,
      purchase_type
    )
    VALUES (
      user_uuid,
      plan,
      'active',
      'redemption_code',
      now(),
      'subscription'
    )
    RETURNING id INTO subscription_id;
    
    -- Return success result
    result := jsonb_build_object(
      'success', true,
      'subscription_id', subscription_id,
      'message', 'Code redeemed successfully'
    );
    
    RETURN result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back the transaction on error
      RAISE;
  END;
END;
$$;


ALTER FUNCTION "public"."redeem_code"("user_uuid" "uuid", "code_uuid" "uuid", "plan" "public"."plan_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."setup_user_organization"("user_uuid" "uuid", "org_name" "text", "org_address" "text", "org_urn" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Create organization
  INSERT INTO public.organizations (name, address, urn)
  VALUES (org_name, org_address, org_urn)
  RETURNING id INTO new_org_id;
  
  -- Add user as admin with primary flag
  INSERT INTO public.organization_memberships (
    user_id,
    organization_id,
    role,
    is_primary
  ) VALUES (
    user_uuid,
    new_org_id,
    'admin',
    true
  );
  
  RETURN new_org_id;
END;
$$;


ALTER FUNCTION "public"."setup_user_organization"("user_uuid" "uuid", "org_name" "text", "org_address" "text", "org_urn" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_descriptor_last_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE action_plan_descriptors
  SET last_updated = NOW()
  WHERE id = NEW.descriptor_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_descriptor_last_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_custom_question_response"("user_uuid" "uuid", "question_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the custom question
  SELECT organization_id INTO org_id
  FROM public.custom_questions
  WHERE id = question_uuid;
  
  -- If question has no organization (global question), allow access
  IF org_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if user is organization member
  RETURN public.user_is_organization_member(user_uuid, org_id);
END;
$$;


ALTER FUNCTION "public"."user_can_access_custom_question_response"("user_uuid" "uuid", "question_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the descriptor
  SELECT organization_id INTO org_id
  FROM public.action_plan_descriptors
  WHERE id = note_descriptor_id;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is organization member
  RETURN public.user_is_organization_member(user_uuid, org_id);
END;
$$;


ALTER FUNCTION "public"."user_can_access_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_survey_response"("user_uuid" "uuid", "template_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the survey template
  SELECT organization_id INTO org_id
  FROM public.survey_templates
  WHERE id = template_id;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is organization member
  RETURN public.user_is_organization_member(user_uuid, org_id);
END;
$$;


ALTER FUNCTION "public"."user_can_access_survey_response"("user_uuid" "uuid", "template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_edit_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get organization_id from the descriptor
  SELECT organization_id INTO org_id
  FROM public.action_plan_descriptors
  WHERE id = note_descriptor_id;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has editor role
  RETURN public.user_has_organization_role(user_uuid, org_id, 'editor');
END;
$$;


ALTER FUNCTION "public"."user_can_edit_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_edit_survey"("user_uuid" "uuid", "template_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the organization ID that owns the template
  SELECT organization_id INTO org_id
  FROM public.survey_templates
  WHERE id = template_id;
  
  IF org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has editor or higher role
  RETURN public.user_has_organization_role(user_uuid, org_id, 'editor');
END;
$$;


ALTER FUNCTION "public"."user_can_edit_survey"("user_uuid" "uuid", "template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_manage_org_membership"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user is admin of the organization using direct query
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships 
    WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."user_can_manage_org_membership"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_view_survey"("user_uuid" "uuid", "template_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the organization ID that owns the template
  SELECT organization_id INTO org_id
  FROM public.survey_templates
  WHERE id = template_id;
  
  IF org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has viewer or higher role
  RETURN public.user_has_organization_role(user_uuid, org_id, 'viewer');
END;
$$;


ALTER FUNCTION "public"."user_can_view_survey"("user_uuid" "uuid", "template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_access"("user_uuid" "uuid", "required_plan" "public"."plan_type") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_plan public.plan_type;
  plan_level INT;
  required_level INT;
BEGIN
  -- Get the user's current active plan
  SELECT plan_type INTO user_plan
  FROM public.subscriptions
  WHERE user_id = user_uuid 
    AND status = 'active'
    AND (end_date IS NULL OR end_date > NOW())
  ORDER BY 
    CASE 
      WHEN plan_type = 'premium' THEN 3
      WHEN plan_type = 'progress' THEN 2
      WHEN plan_type = 'foundation' THEN 1
      WHEN plan_type = 'legacy' THEN 1  -- Legacy has same access level as Foundation
      ELSE 0
    END DESC
  LIMIT 1;
  
  -- If no active subscription found, return false
  IF user_plan IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Determine plan levels
  CASE user_plan
    WHEN 'premium' THEN plan_level := 3;
    WHEN 'progress' THEN plan_level := 2;
    WHEN 'foundation' THEN plan_level := 1;
    WHEN 'legacy' THEN plan_level := 1;  -- Legacy has same access level as Foundation
    ELSE plan_level := 0;
  END CASE;
  
  CASE required_plan
    WHEN 'premium' THEN required_level := 3;
    WHEN 'progress' THEN required_level := 2;
    WHEN 'foundation' THEN required_level := 1;
    WHEN 'legacy' THEN required_level := 1;  -- Legacy has same access level as Foundation
    ELSE required_level := 0;
  END CASE;
  
  -- Return true if user's plan level is >= required level
  RETURN plan_level >= required_level;
END;
$$;


ALTER FUNCTION "public"."user_has_access"("user_uuid" "uuid", "required_plan" "public"."plan_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_organization_role"("user_uuid" "uuid", "org_id" "uuid", "required_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role
  FROM public.organization_memberships
  WHERE user_id = user_uuid AND organization_id = org_id;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Role hierarchy: admin > editor > viewer
  CASE required_role
    WHEN 'viewer' THEN
      RETURN user_role IN ('admin', 'editor', 'viewer');
    WHEN 'editor' THEN
      RETURN user_role IN ('admin', 'editor');
    WHEN 'admin' THEN
      RETURN user_role = 'admin';
    ELSE
      RETURN false;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."user_has_organization_role"("user_uuid" "uuid", "org_id" "uuid", "required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships 
    WHERE user_id = user_uuid AND organization_id = org_id AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."user_is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_organization_member"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships 
    WHERE user_id = user_uuid AND organization_id = org_id
  );
END;
$$;


ALTER FUNCTION "public"."user_is_organization_member"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_plan_descriptors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "section" "text" NOT NULL,
    "reference" "text" NOT NULL,
    "descriptor_text" "text" NOT NULL,
    "status" "public"."descriptor_status" DEFAULT 'Not Started'::"public"."descriptor_status" NOT NULL,
    "deadline" "date",
    "assigned_to" "text",
    "key_actions" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "index_number" character varying(10),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."action_plan_descriptors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_plan_progress_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "descriptor_id" "uuid" NOT NULL,
    "note_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."action_plan_progress_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_plan_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."accreditation_status" DEFAULT 'submitted'::"public"."accreditation_status" NOT NULL,
    "reviewed_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "next_submission_due" timestamp with time zone,
    "reviewer_notes" "text",
    "submission_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."action_plan_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_plan_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."action_plan_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_question_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "response_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_question_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "text" "text" NOT NULL,
    "type" "text" NOT NULL,
    "options" "text"[],
    "creator_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "archived" boolean DEFAULT false,
    "organization_id" "uuid",
    CONSTRAINT "custom_questions_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'multiple_choice'::"text"])))
);


ALTER TABLE "public"."custom_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_scripts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "script_content" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."custom_scripts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_group_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_group_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_groups_type_check" CHECK (("type" = ANY (ARRAY['MAT'::"text", 'federation'::"text", 'local_authority'::"text"])))
);


ALTER TABLE "public"."organization_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "public"."organization_role" DEFAULT 'viewer'::"public"."organization_role" NOT NULL,
    "token" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "urn" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'GBP'::"text" NOT NULL,
    "payment_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "invoice_number" "text",
    "stripe_payment_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billing_contact_name" "text",
    "billing_contact_email" "text",
    "billing_school_name" "text",
    "billing_address" "text",
    "billing_postcode" "text",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "invoice_id" "text"
);


ALTER TABLE "public"."payment_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "price" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'GBP'::"text" NOT NULL,
    "purchase_type" "text",
    "duration_months" integer,
    "stripe_price_id" "text",
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_popular" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "plans_purchase_type_check" CHECK (("purchase_type" = ANY (ARRAY['subscription'::"text", 'one-time'::"text", 'free'::"text"])))
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."plans" IS 'Table storing subscription and one-time payment plans';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "job_title" "text",
    "school_name" "text",
    "school_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_plans" WITH ("security_invoker"='on') AS
 SELECT "id",
    "name",
    "description",
    "price",
    "currency",
    "purchase_type",
    "duration_months",
    "features",
    "is_popular",
    "is_active",
    "sort_order",
    "created_at",
    "updated_at"
   FROM "public"."plans"
  WHERE ("is_active" = true);


ALTER VIEW "public"."public_plans" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_plans" IS 'Public view of active subscription plans. Uses SECURITY INVOKER to respect RLS policies of querying user.';



CREATE TABLE IF NOT EXISTS "public"."survey_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "close_date" timestamp with time zone,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "emails" "text",
    "status" "public"."survey_status" DEFAULT 'Saved'::"public"."survey_status"
);


ALTER TABLE "public"."survey_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_survey_templates" WITH ("security_invoker"='true') AS
 SELECT "id",
    "name",
    "date",
    "close_date",
    "status",
    "organization_id",
    "created_at"
   FROM "public"."survey_templates";


ALTER VIEW "public"."public_survey_templates" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_survey_templates" IS 'Public-safe view of survey templates that excludes sensitive email data';



CREATE TABLE IF NOT EXISTS "public"."redemption_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "plan_type" "public"."plan_type" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "expires_at" timestamp with time zone,
    "max_uses" integer DEFAULT 1,
    "current_uses" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."redemption_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code_id" "uuid",
    "user_id" "uuid",
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "URN" bigint NOT NULL,
    "LA (code)" "text",
    "LA (name)" "text",
    "EstablishmentNumber" bigint,
    "EstablishmentName" "text",
    "TypeOfEstablishment (code)" bigint,
    "TypeOfEstablishment (name)" "text",
    "EstablishmentTypeGroup (code)" bigint,
    "EstablishmentTypeGroup (name)" "text",
    "EstablishmentStatus (code)" bigint,
    "EstablishmentStatus (name)" "text",
    "ReasonEstablishmentOpened (code)" "text",
    "ReasonEstablishmentOpened (name)" "text",
    "OpenDate" "text",
    "ReasonEstablishmentClosed (code)" "text",
    "ReasonEstablishmentClosed (name)" "text",
    "CloseDate" "text",
    "PhaseOfEducation (code)" "text",
    "PhaseOfEducation (name)" "text",
    "StatutoryLowAge" "text",
    "StatutoryHighAge" "text",
    "Boarders (code)" "text",
    "Boarders (name)" "text",
    "NurseryProvision (name)" "text",
    "OfficialSixthForm (code)" "text",
    "OfficialSixthForm (name)" "text",
    "Gender (code)" "text",
    "Gender (name)" "text",
    "ReligiousCharacter (code)" "text",
    "ReligiousCharacter (name)" "text",
    "ReligiousEthos (name)" "text",
    "Diocese (code)" "text",
    "Diocese (name)" "text",
    "AdmissionsPolicy (code)" "text",
    "AdmissionsPolicy (name)" "text",
    "SchoolCapacity" "text",
    "SpecialClasses (code)" "text",
    "SpecialClasses (name)" "text",
    "CensusDate" "text",
    "NumberOfPupils" "text",
    "NumberOfBoys" "text",
    "NumberOfGirls" "text",
    "PercentageFSM" "text",
    "TrustSchoolFlag (code)" "text",
    "TrustSchoolFlag (name)" "text",
    "Trusts (code)" "text",
    "Trusts (name)" "text",
    "SchoolSponsorFlag (name)" "text",
    "SchoolSponsors (name)" "text",
    "FederationFlag (name)" "text",
    "Federations (code)" "text",
    "Federations (name)" "text",
    "UKPRN" "text",
    "FEHEIdentifier" "text",
    "FurtherEducationType (name)" "text",
    "LastChangedDate" "text",
    "Street" "text",
    "Locality" "text",
    "Address3" "text",
    "Town" "text",
    "County (name)" "text",
    "Postcode" "text",
    "SchoolWebsite" "text",
    "TelephoneNum" "text",
    "HeadTitle (name)" "text",
    "HeadFirstName" "text",
    "HeadLastName" "text",
    "HeadPreferredJobTitle" "text",
    "BSOInspectorateName (name)" "text",
    "InspectorateReport" "text",
    "DateOfLastInspectionVisit" "text",
    "NextInspectionVisit" "text",
    "TeenMoth (name)" "text",
    "TeenMothPlaces" "text",
    "CCF (name)" "text",
    "SENPRU (name)" "text",
    "EBD (name)" "text",
    "PlacesPRU" "text",
    "FTProv (name)" "text",
    "EdByOther (name)" "text",
    "Section41Approved (name)" "text",
    "SEN1 (name)" "text",
    "SEN2 (name)" "text",
    "SEN3 (name)" "text",
    "SEN4 (name)" "text",
    "SEN5 (name)" "text",
    "SEN6 (name)" "text",
    "SEN7 (name)" "text",
    "SEN8 (name)" "text",
    "SEN9 (name)" "text",
    "SEN10 (name)" "text",
    "SEN11 (name)" "text",
    "SEN12 (name)" "text",
    "SEN13 (name)" "text",
    "TypeOfResourcedProvision (name)" "text",
    "ResourcedProvisionOnRoll" "text",
    "ResourcedProvisionCapacity" "text",
    "SenUnitOnRoll" "text",
    "SenUnitCapacity" "text",
    "GOR (code)" "text",
    "GOR (name)" "text",
    "DistrictAdministrative (code)" "text",
    "DistrictAdministrative (name)" "text",
    "AdministrativeWard (code)" "text",
    "AdministrativeWard (name)" "text",
    "ParliamentaryConstituency (code)" "text",
    "ParliamentaryConstituency (name)" "text",
    "UrbanRural (code)" "text",
    "UrbanRural (name)" "text",
    "GSSLACode (name)" "text",
    "Easting" "text",
    "Northing" "text",
    "MSOA (name)" "text",
    "LSOA (name)" "text",
    "InspectorateName (name)" "text",
    "SENStat" "text",
    "SENNoStat" "text",
    "BoardingEstablishment (name)" "text",
    "PropsName" "text",
    "PreviousLA (code)" bigint,
    "PreviousLA (name)" "text",
    "PreviousEstablishmentNumber" "text",
    "Country (name)" "text",
    "UPRN" "text",
    "SiteName" "text",
    "QABName (code)" "text",
    "QABName (name)" "text",
    "EstablishmentAccredited (code)" "text",
    "EstablishmentAccredited (name)" "text",
    "QABReport" "text",
    "CHNumber" "text",
    "MSOA (code)" "text",
    "LSOA (code)" "text",
    "FSM" "text",
    "AccreditationExpiryDate" "text"
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_type" "public"."plan_type" DEFAULT 'free'::"public"."plan_type" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'pending'::"public"."subscription_status" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "stripe_subscription_id" "text",
    "invoice_number" "text",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "purchase_type" "text" DEFAULT 'subscription'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billing_level" "text",
    CONSTRAINT "subscriptions_billing_level_check" CHECK (("billing_level" = ANY (ARRAY['group'::"text", 'organization'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."survey_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "survey_template_id" "uuid",
    "role" "text",
    "leadership_prioritize" "text",
    "manageable_workload" "text",
    "work_life_balance" "text",
    "health_state" "text",
    "valued_member" "text",
    "support_access" "text",
    "confidence_in_role" "text",
    "org_pride" "text",
    "recommendation_score" "text",
    "leaving_contemplation" "text",
    "doing_well" "text",
    "improvements" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."survey_responses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_payment_summary" WITH ("security_invoker"='true') AS
 SELECT "ph"."id",
    "ph"."subscription_id",
    "ph"."amount",
    "ph"."currency",
    "ph"."payment_date",
    "ph"."payment_method",
    "ph"."payment_status",
    "ph"."invoice_number",
    "ph"."created_at",
    "s"."plan_type",
    "s"."purchase_type",
    "s"."user_id",
        CASE
            WHEN ("length"("ph"."billing_school_name") > 3) THEN ("substring"("ph"."billing_school_name", 1, 3) || '***'::"text")
            ELSE '***'::"text"
        END AS "billing_school_name_redacted",
    NULL::"text" AS "billing_contact_name",
    NULL::"text" AS "billing_contact_email",
    NULL::"text" AS "billing_address",
    NULL::"text" AS "billing_postcode"
   FROM ("public"."payment_history" "ph"
     LEFT JOIN "public"."subscriptions" "s" ON (("ph"."subscription_id" = "s"."id")));


ALTER VIEW "public"."user_payment_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_roles" IS 'Stores user roles using security definer pattern to prevent privilege escalation';



ALTER TABLE ONLY "public"."action_plan_descriptors"
    ADD CONSTRAINT "action_plan_descriptors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_plan_progress_notes"
    ADD CONSTRAINT "action_plan_progress_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_plan_submissions"
    ADD CONSTRAINT "action_plan_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_plan_templates"
    ADD CONSTRAINT "action_plan_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_question_responses"
    ADD CONSTRAINT "custom_question_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_questions"
    ADD CONSTRAINT "custom_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_scripts"
    ADD CONSTRAINT "custom_scripts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_group_memberships"
    ADD CONSTRAINT "organization_group_memberships_organization_id_group_id_key" UNIQUE ("organization_id", "group_id");



ALTER TABLE ONLY "public"."organization_group_memberships"
    ADD CONSTRAINT "organization_group_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_groups"
    ADD CONSTRAINT "organization_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_urn_key" UNIQUE ("urn");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."redemption_codes"
    ADD CONSTRAINT "redemption_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."redemption_codes"
    ADD CONSTRAINT "redemption_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_code_id_user_id_key" UNIQUE ("code_id", "user_id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("URN");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_survey_id_question_id_key" UNIQUE ("survey_id", "question_id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_templates"
    ADD CONSTRAINT "survey_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_action_plan_submissions_status" ON "public"."action_plan_submissions" USING "btree" ("status");



CREATE INDEX "idx_action_plan_submissions_user_id" ON "public"."action_plan_submissions" USING "btree" ("user_id");



CREATE INDEX "idx_custom_question_responses_question_id" ON "public"."custom_question_responses" USING "btree" ("question_id");



CREATE INDEX "idx_custom_question_responses_response_id" ON "public"."custom_question_responses" USING "btree" ("response_id");



CREATE INDEX "idx_custom_questions_archived" ON "public"."custom_questions" USING "btree" ("archived");



CREATE INDEX "idx_custom_questions_organization_id" ON "public"."custom_questions" USING "btree" ("organization_id");



CREATE INDEX "idx_payment_history_created_at" ON "public"."payment_history" USING "btree" ("created_at");



CREATE INDEX "idx_payment_history_payment_status" ON "public"."payment_history" USING "btree" ("payment_status");



CREATE INDEX "idx_payment_history_status" ON "public"."payment_history" USING "btree" ("payment_status");



CREATE INDEX "idx_payment_history_subscription_id" ON "public"."payment_history" USING "btree" ("subscription_id");



CREATE INDEX "idx_subscriptions_user_id_status" ON "public"."subscriptions" USING "btree" ("user_id", "status");



CREATE INDEX "idx_survey_responses_created_at" ON "public"."survey_responses" USING "btree" ("created_at");



CREATE INDEX "idx_survey_responses_template_id" ON "public"."survey_responses" USING "btree" ("survey_template_id");



CREATE INDEX "idx_survey_templates_creator_id" ON "public"."survey_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_survey_templates_organization_id" ON "public"."survey_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_survey_templates_status_date" ON "public"."survey_templates" USING "btree" ("status", "date");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "plans_active_sort_idx" ON "public"."plans" USING "btree" ("is_active", "sort_order");



CREATE INDEX "plans_stripe_price_id_idx" ON "public"."plans" USING "btree" ("stripe_price_id") WHERE ("stripe_price_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trigger_update_descriptor_last_updated" AFTER INSERT ON "public"."action_plan_progress_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_descriptor_last_updated"();



ALTER TABLE ONLY "public"."action_plan_descriptors"
    ADD CONSTRAINT "action_plan_descriptors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_plan_descriptors"
    ADD CONSTRAINT "action_plan_descriptors_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."action_plan_templates"("id");



ALTER TABLE ONLY "public"."action_plan_descriptors"
    ADD CONSTRAINT "action_plan_descriptors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."action_plan_progress_notes"
    ADD CONSTRAINT "action_plan_progress_notes_descriptor_id_fkey" FOREIGN KEY ("descriptor_id") REFERENCES "public"."action_plan_descriptors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_plan_submissions"
    ADD CONSTRAINT "action_plan_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_plan_submissions"
    ADD CONSTRAINT "action_plan_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_plan_templates"
    ADD CONSTRAINT "action_plan_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_plan_templates"
    ADD CONSTRAINT "action_plan_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."custom_question_responses"
    ADD CONSTRAINT "custom_question_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."custom_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_question_responses"
    ADD CONSTRAINT "custom_question_responses_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."survey_responses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_questions"
    ADD CONSTRAINT "custom_questions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_scripts"
    ADD CONSTRAINT "custom_scripts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "fk_organization_invitations_invited_by" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "fk_organization_invitations_organization_id" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "fk_organization_memberships_organization_id" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "fk_organization_memberships_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_group_memberships"
    ADD CONSTRAINT "organization_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."organization_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_group_memberships"
    ADD CONSTRAINT "organization_group_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemption_codes"
    ADD CONSTRAINT "redemption_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "public"."redemption_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."custom_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."survey_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_survey_template_id_fkey" FOREIGN KEY ("survey_template_id") REFERENCES "public"."survey_templates"("id");



ALTER TABLE ONLY "public"."survey_templates"
    ADD CONSTRAINT "survey_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."action_plan_descriptors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_plan_progress_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_plan_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_plan_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "apd_create_org_editors" ON "public"."action_plan_descriptors" FOR INSERT WITH CHECK ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "apd_delete_org_admins" ON "public"."action_plan_descriptors" FOR DELETE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "apd_update_org_editors" ON "public"."action_plan_descriptors" FOR UPDATE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "apd_view_org_members" ON "public"."action_plan_descriptors" FOR SELECT USING ("public"."user_is_organization_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "appn_create_org_editors" ON "public"."action_plan_progress_notes" FOR INSERT WITH CHECK ("public"."user_can_edit_progress_note"("auth"."uid"(), "descriptor_id"));



CREATE POLICY "appn_delete_org_editors" ON "public"."action_plan_progress_notes" FOR DELETE USING ("public"."user_can_edit_progress_note"("auth"."uid"(), "descriptor_id"));



CREATE POLICY "appn_update_org_editors" ON "public"."action_plan_progress_notes" FOR UPDATE USING ("public"."user_can_edit_progress_note"("auth"."uid"(), "descriptor_id"));



CREATE POLICY "appn_view_org_members" ON "public"."action_plan_progress_notes" FOR SELECT USING ("public"."user_can_access_progress_note"("auth"."uid"(), "descriptor_id"));



CREATE POLICY "aps_create_org_editors" ON "public"."action_plan_submissions" FOR INSERT WITH CHECK ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "aps_delete_org_admins" ON "public"."action_plan_submissions" FOR DELETE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "aps_update_org_editors" ON "public"."action_plan_submissions" FOR UPDATE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "aps_view_org_members" ON "public"."action_plan_submissions" FOR SELECT USING ("public"."user_is_organization_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "apt_create_org_editors" ON "public"."action_plan_templates" FOR INSERT WITH CHECK ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "apt_delete_org_admins" ON "public"."action_plan_templates" FOR DELETE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "apt_update_org_editors" ON "public"."action_plan_templates" FOR UPDATE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "apt_view_org_members" ON "public"."action_plan_templates" FOR SELECT USING ("public"."user_is_organization_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "cq_create_org_editors" ON "public"."custom_questions" FOR INSERT WITH CHECK ((("organization_id" IS NULL) OR "public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text")));



CREATE POLICY "cq_delete_org_admins" ON "public"."custom_questions" FOR DELETE USING ((("organization_id" IS NULL) OR "public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text")));



CREATE POLICY "cq_update_org_editors" ON "public"."custom_questions" FOR UPDATE USING ((("organization_id" IS NULL) OR "public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text")));



CREATE POLICY "cq_view_org_members" ON "public"."custom_questions" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ((("organization_id" IS NOT NULL) AND "public"."user_is_organization_member"("auth"."uid"(), "organization_id")) OR (("organization_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships"
  WHERE ("organization_memberships"."user_id" = "auth"."uid"())))))));



CREATE POLICY "cqr_create_validated" ON "public"."custom_question_responses" FOR INSERT WITH CHECK ((("question_id" IS NOT NULL) AND ("response_id" IS NOT NULL) AND "public"."can_respond_to_custom_question"("question_id", "response_id")));



CREATE POLICY "cqr_delete_org_admins" ON "public"."custom_question_responses" FOR DELETE USING ("public"."user_can_access_custom_question_response"("auth"."uid"(), "question_id"));



CREATE POLICY "cqr_update_org_editors" ON "public"."custom_question_responses" FOR UPDATE USING ("public"."user_can_access_custom_question_response"("auth"."uid"(), "question_id"));



CREATE POLICY "cqr_view_org_members" ON "public"."custom_question_responses" FOR SELECT USING ("public"."user_can_access_custom_question_response"("auth"."uid"(), "question_id"));



ALTER TABLE "public"."custom_question_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_scripts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_scripts_admin_all" ON "public"."custom_scripts" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "custom_scripts_admin_read" ON "public"."custom_scripts" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "om_create_org_admins" ON "public"."organization_memberships" FOR INSERT WITH CHECK ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "om_delete_org_admins" ON "public"."organization_memberships" FOR DELETE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "om_update_org_admins" ON "public"."organization_memberships" FOR UPDATE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "om_view_own_and_admin" ON "public"."organization_memberships" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text")));



CREATE POLICY "org_group_memberships_admin_manage" ON "public"."organization_group_memberships" USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text")) WITH CHECK ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "org_groups_public_read" ON "public"."organization_groups" FOR SELECT USING (true);



CREATE POLICY "org_invitations_create_authenticated" ON "public"."organization_invitations" FOR INSERT TO "authenticated" WITH CHECK (("invited_by" IS NOT NULL));



CREATE POLICY "org_invitations_delete_access" ON "public"."organization_invitations" FOR DELETE USING ("public"."user_can_manage_org_membership"("auth"."uid"(), "organization_id"));



CREATE POLICY "org_invitations_update_access" ON "public"."organization_invitations" FOR UPDATE USING ("public"."user_can_manage_org_membership"("auth"."uid"(), "organization_id"));



CREATE POLICY "org_invitations_view_org_members" ON "public"."organization_invitations" FOR SELECT USING (("public"."user_is_organization_member"("auth"."uid"(), "organization_id") OR (("auth"."uid"() IS NOT NULL) AND ("email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text")) OR (("token" IS NOT NULL) AND ("accepted_at" IS NULL) AND ("expires_at" > "now"()))));



ALTER TABLE "public"."organization_group_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_create_authenticated" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "orgs_delete_admins" ON "public"."organizations" FOR DELETE USING ("public"."user_has_organization_role"("auth"."uid"(), "id", 'admin'::"text"));



CREATE POLICY "orgs_update_admins" ON "public"."organizations" FOR UPDATE USING ("public"."user_has_organization_role"("auth"."uid"(), "id", 'admin'::"text"));



CREATE POLICY "orgs_view_via_invitation" ON "public"."organizations" FOR SELECT USING (("public"."user_is_organization_member"("auth"."uid"(), "id") OR (EXISTS ( SELECT 1
   FROM "public"."organization_invitations"
  WHERE (("organization_invitations"."organization_id" = "organizations"."id") AND ("organization_invitations"."expires_at" > "now"()) AND ("organization_invitations"."accepted_at" IS NULL) AND ("organization_invitations"."token" IS NOT NULL))))));



ALTER TABLE "public"."payment_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_history_admin_view_all" ON "public"."payment_history" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans_admin_create" ON "public"."plans" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "plans_admin_delete" ON "public"."plans" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "plans_admin_read" ON "public"."plans" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "plans_admin_update" ON "public"."plans" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "plans_public_read" ON "public"."plans" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_view_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."redemption_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "redemption_codes_admin_all" ON "public"."redemption_codes" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "redemptions_admin_view_all" ON "public"."redemptions" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "redemptions_create_own" ON "public"."redemptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "redemptions_view_own" ON "public"."redemptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_public_read" ON "public"."schools" FOR SELECT USING (true);



CREATE POLICY "sq_create_org_editors" ON "public"."survey_questions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."survey_templates" "st"
  WHERE (("st"."id" = "survey_questions"."survey_id") AND "public"."user_has_organization_role"("auth"."uid"(), "st"."organization_id", 'editor'::"text")))));



CREATE POLICY "sq_delete_org_editors" ON "public"."survey_questions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."survey_templates" "st"
  WHERE (("st"."id" = "survey_questions"."survey_id") AND "public"."user_has_organization_role"("auth"."uid"(), "st"."organization_id", 'editor'::"text")))));



CREATE POLICY "sq_update_org_editors" ON "public"."survey_questions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."survey_templates" "st"
  WHERE (("st"."id" = "survey_questions"."survey_id") AND "public"."user_has_organization_role"("auth"."uid"(), "st"."organization_id", 'editor'::"text")))));



CREATE POLICY "sq_view_org_members" ON "public"."survey_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."survey_templates" "st"
  WHERE (("st"."id" = "survey_questions"."survey_id") AND "public"."user_is_organization_member"("auth"."uid"(), "st"."organization_id")))));



CREATE POLICY "sr_create_public" ON "public"."survey_responses" FOR INSERT WITH CHECK (("survey_template_id" IS NOT NULL));



CREATE POLICY "sr_delete_org_admins" ON "public"."survey_responses" FOR DELETE USING ("public"."user_can_access_survey_response"("auth"."uid"(), "survey_template_id"));



CREATE POLICY "sr_update_org_editors" ON "public"."survey_responses" FOR UPDATE USING ("public"."user_can_access_survey_response"("auth"."uid"(), "survey_template_id"));



CREATE POLICY "sr_view_org_members" ON "public"."survey_responses" FOR SELECT USING ("public"."user_can_access_survey_response"("auth"."uid"(), "survey_template_id"));



CREATE POLICY "st_create_org_editors" ON "public"."survey_templates" FOR INSERT WITH CHECK ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "st_delete_org_admins" ON "public"."survey_templates" FOR DELETE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'admin'::"text"));



CREATE POLICY "st_update_org_editors" ON "public"."survey_templates" FOR UPDATE USING ("public"."user_has_organization_role"("auth"."uid"(), "organization_id", 'editor'::"text"));



CREATE POLICY "st_view_org_members" ON "public"."survey_templates" FOR SELECT USING ("public"."user_is_organization_member"("auth"."uid"(), "organization_id"));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_view_own" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."survey_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_payment_summary_access" ON "public"."payment_history" FOR SELECT TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."subscriptions" "s"
  WHERE (("s"."id" = "payment_history"."subscription_id") AND ("s"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_view_own" ON "public"."user_roles" FOR SELECT USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."accept_invitation_during_signup"("user_uuid" "uuid", "invitation_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation_during_signup"("user_uuid" "uuid", "invitation_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation_during_signup"("user_uuid" "uuid", "invitation_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_all_payments"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_all_payments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_all_payments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_respond_to_custom_question"("question_uuid" "uuid", "response_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_respond_to_custom_question"("question_uuid" "uuid", "response_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_respond_to_custom_question"("question_uuid" "uuid", "response_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_email_responses"("survey_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_email_responses"("survey_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_email_responses"("survey_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_survey_responses"("survey_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_survey_responses"("survey_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_survey_responses"("survey_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation_with_role"("user_email" "text", "org_id" "uuid", "role_str" "text", "invitation_token" "text", "inviter_id" "uuid", "expiry_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation_with_role"("user_email" "text", "org_id" "uuid", "role_str" "text", "invitation_token" "text", "inviter_id" "uuid", "expiry_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation_with_role"("user_email" "text", "org_id" "uuid", "role_str" "text", "invitation_token" "text", "inviter_id" "uuid", "expiry_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_or_update_profile"("profile_id" "uuid", "profile_first_name" "text", "profile_last_name" "text", "profile_job_title" "text", "profile_school_name" "text", "profile_school_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_or_update_profile"("profile_id" "uuid", "profile_first_name" "text", "profile_last_name" "text", "profile_job_title" "text", "profile_school_name" "text", "profile_school_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_or_update_profile"("profile_id" "uuid", "profile_first_name" "text", "profile_last_name" "text", "profile_job_title" "text", "profile_school_name" "text", "profile_school_address" "text") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_memberships" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_memberships" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_memberships" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_memberships"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_memberships"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_memberships"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_subscription"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_subscription"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_owner"("record_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_owner"("record_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_owner"("record_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_survey_open"("survey_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_survey_open"("survey_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_survey_open"("survey_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_code"("user_uuid" "uuid", "code_uuid" "uuid", "plan" "public"."plan_type") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_code"("user_uuid" "uuid", "code_uuid" "uuid", "plan" "public"."plan_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_code"("user_uuid" "uuid", "code_uuid" "uuid", "plan" "public"."plan_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."setup_user_organization"("user_uuid" "uuid", "org_name" "text", "org_address" "text", "org_urn" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."setup_user_organization"("user_uuid" "uuid", "org_name" "text", "org_address" "text", "org_urn" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."setup_user_organization"("user_uuid" "uuid", "org_name" "text", "org_address" "text", "org_urn" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_descriptor_last_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_descriptor_last_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_descriptor_last_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_custom_question_response"("user_uuid" "uuid", "question_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_custom_question_response"("user_uuid" "uuid", "question_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_custom_question_response"("user_uuid" "uuid", "question_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_survey_response"("user_uuid" "uuid", "template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_survey_response"("user_uuid" "uuid", "template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_survey_response"("user_uuid" "uuid", "template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_edit_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_edit_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_edit_progress_note"("user_uuid" "uuid", "note_descriptor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_edit_survey"("user_uuid" "uuid", "template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_edit_survey"("user_uuid" "uuid", "template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_edit_survey"("user_uuid" "uuid", "template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_manage_org_membership"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_manage_org_membership"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_manage_org_membership"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_view_survey"("user_uuid" "uuid", "template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_view_survey"("user_uuid" "uuid", "template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_view_survey"("user_uuid" "uuid", "template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid", "required_plan" "public"."plan_type") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid", "required_plan" "public"."plan_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid", "required_plan" "public"."plan_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_organization_role"("user_uuid" "uuid", "org_id" "uuid", "required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_organization_role"("user_uuid" "uuid", "org_id" "uuid", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_organization_role"("user_uuid" "uuid", "org_id" "uuid", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_organization_member"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_organization_member"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_organization_member"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
























GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_descriptors" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_descriptors" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_descriptors" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_progress_notes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_progress_notes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_progress_notes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_submissions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_submissions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_submissions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_templates" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_templates" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."action_plan_templates" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_question_responses" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_question_responses" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_question_responses" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_questions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_questions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_questions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_scripts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_scripts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_scripts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_group_memberships" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_group_memberships" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_group_memberships" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_groups" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_groups" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_groups" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_invitations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_invitations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."plans" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."plans" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."plans" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_plans" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_plans" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_plans" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_templates" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_templates" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_templates" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_survey_templates" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_survey_templates" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_survey_templates" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."redemption_codes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."redemption_codes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."redemption_codes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."redemptions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."redemptions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."redemptions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."schools" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."schools" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."schools" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subscriptions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subscriptions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subscriptions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_questions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_questions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_questions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_responses" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_responses" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."survey_responses" TO "service_role";
GRANT INSERT ON TABLE "public"."survey_responses" TO PUBLIC;



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_payment_summary" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_payment_summary" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_payment_summary" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_roles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_roles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";

































-- Lives in the auth schema, so not included in the public schema dump.
CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
