
# RLS Policy Governance Rules

## Overview
This document establishes strict governance rules for Row Level Security (RLS) policies following the comprehensive policy restructure of 2025-06-10.

## Current State (Post-Restructure)
- **Total Policies**: Exactly 48 policies across 22 tables
- **Naming Convention**: Descriptive naming following `{table}_{operation}_{access_level}` pattern
- **Access Pattern**: Organization-based access control with user ownership and admin overrides
- **Functions**: 7 security definer functions to prevent recursion

## Policy Structure

### Tables and Policy Counts
**Core Action Plan Tables (Previously Secured - 16 policies):**
1. **survey_templates** (4 policies): st_view_org_members, st_create_org_editors, st_update_org_editors, st_delete_org_admins
2. **action_plan_descriptors** (4 policies): apd_view_org_members, apd_create_org_editors, apd_update_org_editors, apd_delete_org_admins  
3. **action_plan_templates** (4 policies): apt_view_org_members, apt_create_org_editors, apt_update_org_editors, apt_delete_org_admins
4. **action_plan_progress_notes** (4 policies): appn_view_org_members, appn_create_org_editors, appn_update_org_editors, appn_delete_org_editors

**Core Survey Tables (Previously Secured - 16 policies):**
5. **action_plan_submissions** (4 policies): aps_view_org_members, aps_create_org_editors, aps_update_org_editors, aps_delete_org_admins
6. **survey_responses** (4 policies): sr_view_org_members, sr_create_public, sr_update_org_editors, sr_delete_org_admins
7. **survey_questions** (4 policies): sq_view_org_members, sq_create_org_editors, sq_update_org_editors, sq_delete_org_editors
8. **custom_questions** (4 policies): cq_view_org_members, cq_create_org_editors, cq_update_org_editors, cq_delete_org_admins

**Custom Question Tables (Previously Secured - 8 policies):**
9. **custom_question_responses** (4 policies): cqr_view_org_members, cqr_create_public, cqr_update_org_editors, cqr_delete_org_admins
10. **organization_memberships** (4 policies): om_view_own_and_admin, om_create_org_admins, om_update_org_admins, om_delete_org_admins

**Newly Secured Tables (8 policies):**
11. **profiles** (2 policies): profiles_view_own, profiles_update_own
12. **subscriptions** (1 policy): subscriptions_view_own
13. **payment_history** (2 policies): payment_history_view_own, payment_history_admin_view_all
14. **organizations** (4 policies): orgs_view_members, orgs_create_authenticated, orgs_update_admins, orgs_delete_admins
15. **plans** (4 policies): plans_public_read, plans_admin_create, plans_admin_update, plans_admin_delete
16. **redemption_codes** (1 policy): redemption_codes_admin_all
17. **redemptions** (3 policies): redemptions_view_own, redemptions_create_own, redemptions_admin_view_all
18. **schools** (1 policy): schools_public_read
19. **custom_scripts** (1 policy): custom_scripts_admin_all
20. **organization_invitations** (2 policies): org_invitations_view_own_email, org_invitations_admin_manage
21. **organization_groups** (1 policy): org_groups_public_read
22. **organization_group_memberships** (1 policy): org_group_memberships_admin_manage

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

1. **Maximum Policy Count**: Never exceed 48 total policies across all 22 tables
2. **Naming Convention**: MUST follow descriptive naming pattern
3. **No Self-Reference**: Policies MUST NOT query the same table they protect
4. **Security Definer Only**: Use only the 7 approved security definer functions
5. **Organization-Based**: All organizational access control MUST be organization-based
6. **User Ownership**: Users must own their own data (profiles, subscriptions, payments)

### 🔧 MODIFICATION PROCEDURES

#### Adding New Policies
1. **STOP** - Check if the need can be met by modifying existing policies
2. Document the business requirement
3. Ensure it fits the established access patterns
4. Create a security definer function if needed
5. Test thoroughly in isolation
6. Update this documentation

#### Modifying Existing Policies
1. **NEVER** rename existing policies without updating documentation
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
- [ ] Total policy count ≤ 48
- [ ] All policies follow naming convention
- [ ] No recursive table references
- [ ] All security functions exist and work
- [ ] Organization-based access maintained
- [ ] User ownership preserved
- [ ] No duplicate policy names
- [ ] All operations (SELECT/INSERT/UPDATE/DELETE) covered

### 📋 MONITORING

Regular health checks should verify:
1. Policy count remains at 48
2. No recursive policies exist
3. All security functions are operational
4. Access patterns work as expected
5. No policy naming conflicts
6. User data remains properly secured

## Access Patterns

### User Data Access
- **Profiles**: Users can only view/update their own profile
- **Subscriptions**: Users can only view their own subscriptions
- **Payment History**: Users see own payments, admins see all

### Organization-Based Access
- **Organizations**: Members can view, admins can manage
- **Action Plans**: Organization-based with role hierarchy
- **Surveys**: Organization-based with role hierarchy

### Public Access
- **Schools**: Public read access for search functionality
- **Plans**: Public read access for pricing display

### Admin-Only Access
- **Redemption Codes**: Admin-only management
- **Custom Scripts**: Admin-only management

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

**Remember**: These policies secure critical user and organizational data. Please respect this governance to maintain security and functionality.
