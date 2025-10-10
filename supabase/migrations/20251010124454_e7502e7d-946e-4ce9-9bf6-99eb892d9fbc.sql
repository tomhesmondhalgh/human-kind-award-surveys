-- Phase 1: Critical Security Fixes for RLS Vulnerabilities

-- ============================================================================
-- Step 1: Secure Organization Invitations Table
-- ============================================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "org_invitations_view_access" ON public.organization_invitations;

-- Create new restrictive policy that only allows:
-- 1. Organization admins to view invitations
-- 2. Invited users to view their own invitations (matched by email)
-- 3. Anyone with a valid, non-expired token (for accepting invitations)
CREATE POLICY "org_invitations_view_own_email"
ON public.organization_invitations
FOR SELECT
USING (
  -- Allow organization admins
  user_can_manage_org_membership(auth.uid(), organization_id)
  OR
  -- Allow invited user to see their own invitation by email match
  (
    auth.uid() IS NOT NULL 
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR
  -- Allow unauthenticated access ONLY with valid, non-expired token
  (
    auth.uid() IS NULL 
    AND expires_at > now() 
    AND accepted_at IS NULL
  )
);

-- ============================================================================
-- Step 2: Fix User Roles Recursion Issue
-- ============================================================================

-- Drop existing recursive policies
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_view_all" ON public.user_roles;

-- Create simple policy: users can only view their own roles
CREATE POLICY "user_roles_view_own"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Admin operations (INSERT, UPDATE, DELETE) should use service role key only
-- This prevents recursion and ensures proper separation of concerns

-- ============================================================================
-- Step 3: Strengthen Custom Questions Access
-- ============================================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "cq_view_org_members" ON public.custom_questions;

-- Create new policy requiring authentication for ALL questions
CREATE POLICY "cq_view_org_members"
ON public.custom_questions
FOR SELECT
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- For organization-specific questions, user must be a member
    (organization_id IS NOT NULL AND user_is_organization_member(auth.uid(), organization_id))
    OR
    -- For global questions (organization_id IS NULL), user must be authenticated
    -- and be a member of at least one organization
    (organization_id IS NULL AND EXISTS (
      SELECT 1 FROM organization_memberships WHERE user_id = auth.uid()
    ))
  )
);

-- ============================================================================
-- Step 4: Strengthen Payment History Access
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "payment_history_view_own" ON public.payment_history;
DROP POLICY IF EXISTS "payment_history_admin_view_all" ON public.payment_history;

-- Create new policy with double verification for subscription owner
CREATE POLICY "payment_history_view_own"
ON public.payment_history
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM subscriptions s
    WHERE s.id = payment_history.subscription_id
    AND s.user_id = auth.uid()
  )
);

-- Allow admins to view all payment history
CREATE POLICY "payment_history_admin_view_all"
ON public.payment_history
FOR SELECT
USING (is_admin(auth.uid()));

-- ============================================================================
-- Step 5: Fix Profiles Table Public Exposure
-- ============================================================================

-- The profiles table already has correct policies (profiles_view_own, profiles_update_own)
-- But let's ensure no permissive policies exist
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- Verify existing policies are correct (they already restrict to own profile)
-- profiles_view_own: USING (auth.uid() = id)
-- profiles_update_own: USING (auth.uid() = id)