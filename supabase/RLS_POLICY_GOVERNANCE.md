
# RLS Policy Governance Rules

## Overview
This document establishes strict governance rules for Row Level Security (RLS) policies to prevent the chaos that led to the "Great Policy Reset" of 2025-06-10.

## Current State (Post-Nuclear Reset)
- **Total Policies**: Exactly 40 policies across 10 tables
- **Naming Convention**: `{table_prefix}_{operation}_{access_level}`
- **Access Pattern**: Organization-based access control
- **Functions**: 7 security definer functions to prevent recursion

## Policy Structure

### Tables and Policy Counts
1. **survey_templates** (4 policies): st_view_org_members, st_create_org_editors, st_update_org_editors, st_delete_org_admins
2. **action_plan_descriptors** (4 policies): apd_view_org_members, apd_create_org_editors, apd_update_org_editors, apd_delete_org_admins
3. **action_plan_templates** (4 policies): apt_view_org_members, apt_create_org_editors, apt_update_org_editors, apt_delete_org_admins
4. **action_plan_progress_notes** (4 policies): appn_view_org_members, appn_create_org_editors, appn_update_org_editors, appn_delete_org_editors
5. **action_plan_submissions** (4 policies): aps_view_org_members, aps_create_org_editors, aps_update_org_editors, aps_delete_org_admins
6. **survey_responses** (4 policies): sr_view_org_members, sr_create_public, sr_update_org_editors, sr_delete_org_admins
7. **survey_questions** (4 policies): sq_view_org_members, sq_create_org_editors, sq_update_org_editors, sq_delete_org_editors
8. **custom_questions** (4 policies): cq_view_org_members, cq_create_org_editors, cq_update_org_editors, cq_delete_org_admins
9. **custom_question_responses** (4 policies): cqr_view_org_members, cqr_create_public, cqr_update_org_editors, cqr_delete_org_admins
10. **organization_memberships** (4 policies): om_view_own_and_admin, om_create_org_admins, om_update_org_admins, om_delete_org_admins

### Security Definer Functions
1. `user_is_organization_member(uuid, uuid)` - Check basic membership
2. `user_has_organization_role(uuid, uuid, text)` - Check role hierarchy
3. `user_can_access_survey_response(uuid, uuid)` - Survey response access
4. `user_can_access_custom_question_response(uuid, uuid)` - Custom question response access
5. `user_can_access_progress_note(uuid, uuid)` - Progress note viewing
6. `user_can_edit_progress_note(uuid, uuid)` - Progress note editing
7. `user_can_manage_org_membership(uuid, uuid)` - Membership management

## STRICT GOVERNANCE RULES

### 🚨 CRITICAL RULES - NEVER VIOLATE THESE

1. **Maximum Policy Count**: Never exceed 40 total policies across all 10 tables
2. **Naming Convention**: MUST follow `{table_prefix}_{operation}_{access_level}` pattern
3. **No Self-Reference**: Policies MUST NOT query the same table they protect
4. **Security Definer Only**: Use only the 7 approved security definer functions
5. **Organization-Based**: All access control MUST be organization-based

### 🔧 MODIFICATION PROCEDURES

#### Adding New Policies
1. **STOP** - Check if the need can be met by modifying existing policies
2. Document the business requirement
3. Ensure it fits the organization-based access pattern
4. Create a security definer function if needed
5. Test thoroughly in isolation
6. Update this documentation

#### Modifying Existing Policies
1. **NEVER** rename existing policies
2. Test changes in a separate branch first
3. Ensure no recursion is introduced
4. Validate against all affected operations
5. Update documentation immediately

#### Emergency Procedures
If policy conflicts arise:
1. Stop all policy modifications immediately
2. Identify the specific conflict
3. Use targeted DROP/CREATE for only the affected policies
4. Test each operation systematically
5. Document the resolution

### 🔍 VALIDATION CHECKLIST

Before any policy changes:
- [ ] Total policy count ≤ 40
- [ ] All policies follow naming convention
- [ ] No recursive table references
- [ ] All security functions exist and work
- [ ] Organization-based access maintained
- [ ] No duplicate policy names
- [ ] All operations (SELECT/INSERT/UPDATE/DELETE) covered

### 📋 MONITORING

Regular health checks should verify:
1. Policy count remains at 40
2. No recursive policies exist
3. All security functions are operational
4. Access patterns work as expected
5. No policy naming conflicts

## Role Hierarchy
- **admin**: Full access (can delete, manage memberships)
- **editor**: Create and modify content (cannot delete or manage memberships)
- **viewer**: Read-only access (lowest level)

## Contact
If you need to modify RLS policies, please:
1. Read this document completely
2. Understand the business requirement
3. Follow the modification procedures
4. Test thoroughly
5. Document all changes

**Remember**: These policies were created after a complete nuclear reset due to policy chaos. Please respect this governance to avoid future disasters.
