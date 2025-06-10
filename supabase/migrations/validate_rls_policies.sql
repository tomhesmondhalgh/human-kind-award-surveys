
-- RLS Policy Validation Script
-- Run this periodically to ensure policy health

-- Check total policy count (should be exactly 40)
SELECT 
  'Policy Count Check' as check_type,
  COUNT(*) as current_count,
  40 as expected_count,
  CASE 
    WHEN COUNT(*) = 40 THEN '✅ PASS' 
    ELSE '❌ FAIL - Policy count mismatch!' 
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'survey_templates', 'action_plan_descriptors', 'action_plan_templates',
  'action_plan_progress_notes', 'action_plan_submissions', 'survey_responses',
  'survey_questions', 'custom_questions', 'custom_question_responses',
  'organization_memberships'
);

-- Check for proper naming convention
SELECT 
  'Naming Convention Check' as check_type,
  tablename,
  policyname,
  CASE 
    WHEN policyname ~ '^(st|apd|apt|appn|aps|sr|sq|cq|cqr|om)_(view|create|update|delete)_' 
    THEN '✅ PASS' 
    ELSE '❌ FAIL - Bad naming convention!' 
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'survey_templates', 'action_plan_descriptors', 'action_plan_templates',
  'action_plan_progress_notes', 'action_plan_submissions', 'survey_responses',
  'survey_questions', 'custom_questions', 'custom_question_responses',
  'organization_memberships'
)
ORDER BY tablename, policyname;

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
  'organization_memberships', 'organization_invitations'
)
ORDER BY tablename;

-- Summary
SELECT 
  '📊 SUMMARY' as check_type,
  'All critical tables should have exactly 4 policies each' as note,
  'Total expected: 40 policies across 10 tables' as expectation,
  'If any checks fail, review RLS_POLICY_GOVERNANCE.md' as action_required;
