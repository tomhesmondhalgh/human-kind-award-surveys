# Remediation Plan

Plan to fix the findings of the 2026-09-26 full code review (four parallel reviews: RLS/database, edge functions, frontend, build — every claim below was verified against the code). Work through the phases in order; each numbered item should be a small, reviewable commit. Tom merges PRs and runs anything that touches the live database or deploys functions (`supabase db push`, `supabase functions deploy`) — prepare the commands and hand them over.

**Ground rules for the delivering session**

- The app's browser code talks straight to Supabase, so RLS is the security boundary. Schema changes go in new files under `supabase/migrations/`, tested locally first: `npx supabase start` (needs Docker), then `npx supabase db diff --linked --schema public` to compare with live.
- The live DB has real data (157 users, schools' staff wellbeing responses). Never test against it. A full backup from 2026-09-26 exists outside the repo.
- The **deployed** edge functions on Supabase may differ from this repo (Lovable deployed them separately). Before fixing a function, assume the repo copy is the source of truth going forward, but when a finding says "broken" (e.g. `create-payment-session`), remember the deployed copy might be an older working version. Ask Tom whether card payments have worked recently before touching payment flows.
- After schema changes, regenerate types: `npx supabase gen types typescript --project-id bagaaqkmewkuwtudwnqw > src/integrations/supabase/types.ts`.
- Manual test script: `TestPlan.md`. Unit tests are fixed in item 3.7 — after that, keep them green.

**Known trap — signup flow.** `supabase/config.toml` has `enable_confirmations = true`, and `src/utils/auth/signUp.ts` calls `create_or_update_profile` (line ~104), `setup_user_organization` (~149) and `accept_invitation_during_signup` (~183) client-side right after `signUp()` — at that point there may be **no session**, so `auth.uid()` is NULL. Locking those functions to `auth.uid()` naively will break signup. The fixes in Phase 1 route around this; test the full signup path (fresh email, and invitation-accept signup) locally before shipping.

## Status (updated 2026-09-27)

**All 36 items are done and deployed**, plus the follow-ups found along the way. What remains is optional, listed at the end.

| Items | PRs |
|---|---|
| Phase 1 (1-22) | #35, #36, #37 |
| Phase 2: 23-25 blocked features, 26 post-payment, 28 tests | #41, #44, #39 |
| Phase 1 follow-ups: closure emails via pg_cron, HubSpot survey creators | #45, #46 |
| 27 schema integrity, remaining anon EXECUTE grants | indexes #47; duplicate FKs, NOT NULL/RESTRICT and anon grants #53 |
| 29, 30, 32, 36 | #38, #40, #42, #43 |
| 31 one auth system | #50 |
| 33 dependencies | #39 (removals, devDependencies), #51 (jspdf 4, react-router 7; audit 0), #56 (unused Stripe.js removed) |
| 34 consolidation | #52 (also made payment_history.amount pounds everywhere) |
| 35 TypeScript ratchet | #55 (`strict: true`, lint 0 errors) |
| Custom scripts removal | #49 |

Found and fixed after the review:
- Logged-out respondents couldn't open surveys (since 2025-10-14): #54.
- Error reporting through Sentry: #48. Source-map upload in #56 (needs `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` set in Vercel).
- Admin redemption details always failed: #56.
- The auth email hooks now report Resend failures: #56.

Open questions: all answered by Tom. Global custom questions are admin-only; invitations must be accepted with the invited email; custom scripts are deleted.

Optional follow-ups:
- About 80 `no-explicit-any` lint warnings. Fix them as files are touched.
- Four unit tests are still skipped: `tests/integration/organization.test.tsx` predates the current OrganizationContext.

---

## Phase 1 — Critical security (do first, one PR for the migration + one for edge functions)

### 1A. Database migration (`supabase migration new fix_critical_rls`)

1. **Org-takeover chain.**
   - Replace policy `org_invitations_create_authenticated` on `organization_invitations` (baseline.sql:2202): `WITH CHECK (public.user_can_manage_org_membership(auth.uid(), organization_id) AND invited_by = auth.uid())`.
   - In `accept_invitation_during_signup` (baseline.sql:178): keep the email-match check, and add: reject if the invitation's `invited_by` is not (still) a manager of that org — belt and braces since old bogus invitations may exist in the live table. Also **audit existing rows**: prepare a query for Tom listing pending invitations whose `invited_by` is not an org manager, for manual review/deletion.
2. **Invitation leak.** Rewrite policy `org_invitations_view_org_members` (baseline.sql:2214): keep only the two legitimate branches (org member, or `email` matches the authenticated user's email). Delete the third `token IS NOT NULL AND accepted_at IS NULL AND expires_at > now()` branch — invitees preview invitations via the `get-invitation-details` edge function (service role), which still works. Check `orgs_view_via_invitation` on `organizations` (baseline.sql:2247) for the same pattern and scope it to the authenticated invitee's email.
3. **Caller-supplied `user_uuid` in SECURITY DEFINER RPCs.**
   - `get_user_memberships`, `get_user_organizations`, `get_user_subscription`: add `IF user_uuid != auth.uid() AND NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION` (pattern already in `redeem_code`). These are only called post-login — safe.
   - `create_or_update_profile` and `setup_user_organization`: called pre-session during signup (see trap). Fix: `handle_new_user` (baseline.sql:593) already creates the profile from `raw_user_meta_data` — extend the trigger (or a new `SECURITY DEFINER` function it calls) to also perform the org setup from metadata passed at `signUp()` time, then add the `auth.uid()` guard to both RPCs and update `signUp.ts` to stop calling them pre-session (pass the data in `options.data` instead). If metadata plumbing turns out hairy, fallback: move both calls into a small edge function using the service role that verifies the just-created user via the signup response, and revoke anon EXECUTE.
   - `REVOKE EXECUTE ... FROM anon` on every function not needed pre-login (keep for: `is_survey_open`, `can_respond_to_custom_question` if used by policies, and whatever the reworked signup path needs). Also fix `ALTER DEFAULT PRIVILEGES` (baseline.sql:2934-2957) so future tables/functions don't auto-grant to `anon`.
4. **`redeem_code` free-plan hole** (baseline.sql:688). Inside the function: look up the code by `code_uuid`; verify `active`, not expired, `current_uses < max_uses` atomically (`UPDATE ... WHERE current_uses < max_uses RETURNING`); take the plan from `redemption_codes.plan_type`, ignoring the caller's `plan` argument (keep the signature so the edge function doesn't break, or update both together).
5. **Survey-response stuffing.** Policy `sr_create_public` (baseline.sql:2347): `WITH CHECK (public.is_survey_open(survey_template_id))` (helper exists at :670). Same treatment for `cqr_create_validated` (:2145), and fix `can_respond_to_custom_question` (:341) to actually validate that `question_uuid` belongs to an open survey (it currently ignores the parameter). Remove `GRANT INSERT ... TO PUBLIC` (:2912) in favour of the scoped policy. Note: anonymous submission is a product feature — keep it working; the edge function `submit-survey-response` remains the preferred door.
6. **Global custom questions** (baseline.sql:2127-2157): the `organization_id IS NULL` branches in `cq_create/update/delete` policies → require `public.is_admin(auth.uid())`. `user_can_access_custom_question_response` (:801): NULL-org questions → admin-only (not `true`).
7. **Drop `create_invitation_with_role`** (baseline.sql:417) — references a nonexistent table and enum, no auth checks, granted to anon. Confirm nothing calls it (frontend doesn't; grep edge functions), then `DROP FUNCTION`.
8. **Viewer write access**: `sr_update_org_editors` / `sr_delete_org_admins` (:2351-2355) and the cqr equivalents currently use a membership-only helper. Switch to `user_has_organization_role(auth.uid(), organization_id, 'editor')` / `'admin'` to match the policy names.
9. **`handle_new_user` robustness** (:593): wrap body in `BEGIN...EXCEPTION WHEN OTHERS THEN RETURN NEW` and use `ON CONFLICT (id) DO NOTHING`, so a profile hiccup can never block signup.

Verify: `supabase start` clean; signup (plain + via invitation), team invite, survey submit (open + closed survey → closed must fail), redemption, all tested locally; `db diff --linked` shows exactly the intended changes; prepare `npx supabase db push` for Tom.

### 1B. Edge functions (deploy list at the end; Tom runs the deploy)

10. **Email fleet lockdown.** For `send-survey-email`, `send-analysis-email`, `send-closure-notification`, `send-welcome-email`, `send-admin-notification`: require a JWT (`auth.getUser`) AND verify the caller owns the referenced survey/resource before sending. `send-analysis-email` must stop accepting raw `htmlContent` — render the email server-side from `surveyId`. `send-survey-email` must build the survey URL server-side from the survey id. Flip their `verify_jwt` to `true` in `config.toml` where the caller is always logged in (check each frontend call site).
11. **Auth-hook mailers** (`send-auth-email`, `send-password-reset-email`): verify the Supabase Auth hook signature (standardwebhooks + `SEND_EMAIL_HOOK_SECRET`); Tom sets the secret in Supabase and in the hook config. Until verified, these are open password-reset-email forgers.
12. **HTML-escape every interpolation** in `_shared/emailTemplate.ts` and each mailer (add a shared `escapeHtml`).
13. **`cancel-subscription`**: derive the user from `auth.getUser(jwt)`; remove `userId` from the body; use Stripe's cancel-at-period-end and keep the DB row `active` until the webhook says otherwise.
14. **`stripe-webhook`**: use `await stripe.webhooks.constructEventAsync(..., Stripe.createSubtleCryptoProvider())`; **fail closed** (400) if `STRIPE_WEBHOOK_SECRET` is unset; return 500 when DB writes fail so Stripe retries; fix status mapping (`trialing`/`past_due` are not `canceled`).
15. **`create-payment-session`**: fix the undefined `priceId` (real variable `stripePriceId`) at index.ts:114; delete the header/JWT logging at :27-30. Before deploying, ask Tom about recent card payments (deployed copy may differ — download it with `npx supabase functions download create-payment-session` to compare).
16. **`sync-hubspot-users`**: require auth + `is_admin` RPC. **`hubspot-integration`**: require auth for frontend calls; internal calls (from sync) use a shared secret header; whitelist `listId`s; drop `knownHubspotId`.
17. **`check-email-exists`**: only answer when the request carries a valid invitation token for that email; fix the 50-user pagination bug or use a direct lookup. If Tom confirms the AcceptInvitation flow can live without it, delete it instead.
18. **`generate-survey-summary`**: require auth + survey ownership; fetch responses server-side by `surveyId` rather than trusting client-supplied data.
19. **`send-team-invitation` (v1)**: internal-only — require a shared secret header from v2, or fold into v2. In **v2**, remove the dead `.from('auth.users')` duplicate-member check (always errors, silently skipped) and replace with a real check via service-role `auth.admin` API or the memberships table.
20. **CORS**: replace wildcard `Access-Control-Allow-Origin` with `https://surveys.humankindaward.com` (+ `http://localhost:8080` for dev) via a shared helper.
21. **Housekeeping**: remove the `send-test-emails` config entry (no code exists); align `supabase-js`/Stripe import versions across functions; add config.toml entries (explicit `verify_jwt`) for the five functions missing them.
22. **`verify-redemption-code`**: after item 4, the TypeScript-side checks become advisory; keep, but the SQL is authoritative.

Verify: `curl` each function unauthenticated → expect 401; with a valid user JWT but someone else's resource → 403. Prepare the `npx supabase functions deploy <name>` list for Tom, ordered so nothing breaks between DB push and function deploys (deploy functions immediately after the migration; items 10-12 are safe to deploy first).

## Phase 2 — Broken features & consistency (one PR per numbered group)

23. **Team page blank names**: add a shared-org SELECT policy on `profiles` via a SECURITY DEFINER helper (users may read profiles of people who share an organisation with them).
24. **Admin management UIs**: add `is_admin`-gated INSERT/DELETE policies on `user_roles` and an UPDATE policy on `payment_history`; add `OR is_admin(auth.uid())` to the `action_plan_submissions` policies so the accreditation screen works for platform admins.
25. **One admin model**: replace `profiles.is_admin` checks in `update-invoice-status` (index.ts:~155-167) and `send-accreditation-notification` (~36-39), and the `role = 'administrator'` check in `check-subscription` (~59), with the `is_admin` RPC used by `admin-get-users`.
26. **Dead client-side subscription path**: remove `checkAndCreateSubscription` from `PaymentSuccess.tsx` (RLS already blocks it); make the page poll `check-subscription` until the webhook has landed. Depends on 14/15 being deployed.
27. **Schema integrity**: drop duplicate FKs on `organization_memberships`/`organization_invitations` (removes the `!fk_` hint workarounds — update `useTeamMembers.tsx:132`); add missing indexes (`action_plan_descriptors(organization_id, template_id, user_id)`, `organization_memberships(organization_id)`, `survey_questions(question_id)`, `action_plan_progress_notes(descriptor_id)`); give `survey_responses.survey_template_id` NOT NULL + explicit ON DELETE; drop the duplicate `payment_history` index and fix the mislabeled `idx_survey_templates_creator_id`.
28. **Tests**: `npm install -D @testing-library/dom@^10`, add `exclude: [...configDefaults.exclude, 'tests/e2e/**']` to `vitest.config.ts`; move `@playwright/test`, `vitest`, `jsdom`, `@testing-library/*` to devDependencies. Get the 5 suites passing.

## Phase 3 — Quality & debt (steady background; each bullet independently shippable)

29. **Kill production logging**: `esbuild: { drop: ['console', 'debugger'] }` in `vite.config.ts`; delete the JWT-diagnostics block in `utils/team/invitationUtils.ts:90-130` (including its second hardcoded client) and the Shift+D debug panel in `ProtectedRoute.tsx:44-106`.
30. **Delete dead code** (~2,500 lines, import-verified): `services/authService.ts`, `utils/authUtils.ts`, `utils/stripeUtils.ts`, `utils/db/queryOptimizer.ts`, `utils/auth/sessionAwareDb.ts` + `sessionGuards.ts`, `contexts/StripeContext.tsx`, `components/admin/NewPagination.tsx`, `components/action-plan/DescriptorsTable.tsx` (top-level copy), `pages/ActionPlan.tsx` + `utils/actionPlan/index.ts`, `components/common/FeedbackButton.tsx`, `components/survey-form/SurveyFormContainer.tsx`, `components/team/hooks/useProfiles.tsx`, custom-scripts stubs (+ table drop in a migration if Tom agrees). Re-verify imports before each deletion.
31. **Collapse auth to one system**: keep supabase-js `autoRefreshToken` + one thin `useAuthState`; delete `useEnhancedSession`, `SessionMonitor`, `sessionValidator` (fold into `sessionUtils`); remove per-call `getSession()` re-verification (17 sites). This is the riskiest refactor — do it as one focused PR with manual login/logout/multi-tab testing against TestPlan.md §1.
32. **Code splitting**: `React.lazy` all routes in `App.tsx`; dynamic-import `jspdf`/`html2canvas` inside the export handlers. Target: initial chunk under ~500KB gzip (from 612KB gzip / 2.15MB raw), and survey respondents no longer download the admin app.
33. **Dependencies**: remove `react-datepicker`, `uuid`, `canvg` (+ their @types); `npm audit fix` the 22 vulns (2 critical); upgrade `@stripe/*`; add `"engines": {"node": ">=20"}`; `npx update-browserslist-db@latest`.
34. **Consolidate**: one subscription service (fix the `enterprise` planLevels drift in `useSubscription.tsx:46`), one pagination component, one toast path (`toastService`), one supabase import path; migrate hand-rolled fetch hooks to react-query opportunistically as files are touched (delete `utils/cache/cacheUtils.ts` when its 4 consumers are converted); fix `formatCurrency`'s magnitude-guessing in `lib/utils.ts:22` (store/pass explicit units).
35. **TypeScript ratchet**: turn on `noImplicitAny` + `strictNullChecks` (47 errors to fix, concentrated in auth and payment code); re-enable `@typescript-eslint/no-unused-vars`; work down the 143 `no-explicit-any` errors starting with `AuthContext.tsx` and `typeConversions.ts`; fix the 17 `react-hooks/exhaustive-deps` warnings (auth/org/Stripe contexts first).
36. **Small fixes**: absolute `og:image` URL (`https://surveys.humankindaward.com/og-image.png`); local favicon instead of the HubSpot CDN link; fix invalid `.is('stripe_subscription_id','not.null')` in `check-subscription:107`; unify the three hardcoded fallback domains onto `SITE_URL`.

## Phase 1 status and follow-ups (added 2026-09-26)

Phase 1 is in PRs #35 (database), #36 (email functions) and #37 (payments, HubSpot, remaining functions), each with deploy steps. Found during Phase 1, now Phase 2 work:

- **Closure emails have never worked.** `checkForClosedSurveys` (`src/utils/survey/templates.ts`) queries `profiles(email)`, which doesn't exist, and runs in every logged-in user's browser. Replace it with a scheduled job (pg_cron + the now-secured `send-closure-notification`), and record which surveys have been notified so nobody is emailed twice.
- **`sync-hubspot-users` "survey creators" mode** queries `survey_templates.creator_id`, which doesn't exist. Decide what "creator" means (org admins with surveys?) and fix.
- **Remaining anon EXECUTE grants** on the boolean helper functions (`user_is_organization_member` etc.) and Supabase's default privileges were deliberately left in #35. RLS policies call those helpers during anonymous survey submission, so revoke them carefully, testing the public survey form.
- **Six orphaned edge functions** are live on Supabase with no source in the repo; #36's deploy steps delete them.
- `send-password-reset-email` and `send-auth-email` ignore Resend errors (they report success when sending fails). Minor.

## Open questions for Tom (don't block Phase 1 on these)

- Have card payments worked recently? (Determines urgency/approach for items 15/26.)
- Is anyone meant to create "global" custom questions other than platform admins? (Item 6 assumes admins only.)
- Should invitation-acceptance require the invited email to match the accepting account, or is "accept under a different email" a feature? (Currently not enforced — Phase 2 candidate either way.)
- Is `check-email-exists` needed at all in the AcceptInvitation flow?
- OK to drop the disabled custom-scripts feature and its table entirely?

## Definition of done

Phase 1: all four critical DB holes closed (re-run the exploit steps locally → all fail); no email function callable without auth; webhook fails closed; `db diff --linked` clean after push. Phase 2: TestPlan.md sections for team management, admin, and accreditation pass; test suite green. Phase 3: initial bundle <500KB gzip; zero console output in a production build; lint clean; `noImplicitAny`+`strictNullChecks` on.
