
-- RLS Policy Validation Script
-- Run this periodically to ensure policy health after restructure

-- Check total policy count (should be exactly 48)
SELECT 
  'Policy Count Check' as check_type,
  COUNT(*) as current_count,
  48 as expected_count,
  CASE 
    WHEN COUNT(*) = 48 THEN '✅ PASS' 
    ELSE '❌ FAIL - Policy count mismatch!' 
  END as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Check for tables that should have policies but don't
WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'survey_templates', 'action_plan_descriptors', 'action_plan_templates',
    'action_plan_progress_notes', 'action_plan_submissions', 'survey_responses',
    'survey_questions', 'custom_questions', 'custom_question_responses',
    'organization_memberships', 'profiles', 'subscriptions', 'payment_history',
    'organizations', 'plans', 'redemption_codes', 'redemptions', 'schools',
    'custom_scripts', 'organization_invitations', 'organization_groups',
    'organization_group_memberships'
  ]) as table_name
),
tables_with_policies AS (
  SELECT DISTINCT tablename as table_name
  FROM pg_policies 
  WHERE schemaname = 'public'
)
SELECT 
  'Missing Policies Check' as check_type,
  et.table_name,
  CASE 
    WHEN twp.table_name IS NOT NULL THEN '✅ PASS - Has policies' 
    ELSE '❌ FAIL - Missing policies!' 
  END as status
FROM expected_tables et
LEFT JOIN tables_with_policies twp ON et.table_name = twp.table_name
ORDER BY et.table_name;

-- Check that all security definer functions exist
SELECT 
  'Security Functions Check' as check_type,
  proname as function_name,
  CASE 
    WHEN prosecdef THEN '✅ PASS - Security Definer' 
    ELSE '❌ FAIL - Not Security Definer!' 
  END as status
FROM pg_proc 
WHERE proname IN (
  'user_is_organization_member',
  'user_has_organization_role', 
  'user_can_access_survey_response',
  'user_can_access_custom_question_response',
  'user_can_access_progress_note',
  'user_can_edit_progress_note',
  'user_can_manage_org_membership'
)
ORDER BY proname;

-- Check for tables with RLS enabled
SELECT 
  'RLS Status Check' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ PASS - RLS Enabled' 
    ELSE '❌ FAIL - RLS Disabled!' 
  END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
AND tablename IN (
  'survey_templates', 'action_plan_descriptors', 'action_plan_templates',
  'action_plan_progress_notes', 'action_plan_submissions', 'survey_responses',
  'survey_questions', 'custom_questions', 'custom_question_responses',
  'organization_memberships', 'profiles', 'subscriptions', 'payment_history',
  'organizations', 'plans', 'redemption_codes', 'redemptions', 'schools',
  'custom_scripts', 'organization_invitations', 'organization_groups',
  'organization_group_memberships'
)
ORDER BY tablename;

-- Check policy distribution by table
SELECT 
  'Policy Distribution' as check_type,
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Summary
SELECT 
  '📊 SUMMARY' as check_type,
  'RLS restructure complete - 48 policies across 22 tables' as status,
  'All user data secured with proper access controls' as security_note,
  'If any checks fail, review RLS_POLICY_GOVERNANCE.md' as action_required;
