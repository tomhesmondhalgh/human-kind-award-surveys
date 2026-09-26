# Human Kind Wellbeing Surveys

Staff wellbeing survey platform for schools. Originally built in Lovable; now developed directly. Lovable no longer touches this repo, so ignore any "auto-generated, do not edit" comments that came from it.

Background docs: `AppDescription.md` (features), `TestPlan.md` (manual test script), `SECURITY_FIXES.md` (past RLS/security work), `work-in-progress.md`.

## Commands

- `npm run dev`: dev server on http://localhost:8080
- `npm run build`: production build
- `npm run lint`: ESLint
- `npm test`: Vitest (unit + integration tests in `tests/`); `npm run test:e2e`: Playwright. The test setup is currently broken: `@testing-library/dom` is missing, and Vitest picks up the Playwright specs in `tests/e2e`.

`.npmrc` sets `legacy-peer-deps=true`; installs fail without it.

## Architecture

- **Frontend:** React 18 + TypeScript + Vite, Tailwind, shadcn/ui (`src/components/ui/`: generated library components, rarely edit), React Router (routes in `src/App.tsx`), TanStack Query.
- **Backend:** Supabase project `bagaaqkmewkuwtudwnqw`. The browser queries tables directly with supabase-js, so **row-level security policies in the database are the security boundary**. Any new table needs RLS policies.
- **Supabase client:** `src/integrations/supabase/client.ts` (typed with `Database` from `types.ts`). `src/lib/supabase` re-exports it. The anon key in it is public by design. Never put the service-role key in frontend code.
- **Auth:** Supabase Auth (email + password). Some auth emails go through custom edge functions (`send-auth-email`, `send-password-reset-email`).
- **Edge functions:** `supabase/functions/*` (Deno), with shared code in `_shared/`. They handle Stripe (checkout, webhook, subscriptions), Resend emails, HubSpot sync, OpenAI summaries, team invitations, survey submission and redemption codes. `verify_jwt` per function is in `supabase/config.toml`. Secrets live in Supabase, not this repo: `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `HUBSPOT_API_KEY`, `OPENAI_API_KEY`, `SITE_URL`, `FRONTEND_URL`.
- **Hosting:** Vercel (`vercel.json`); production deploys from `main`. Edge functions are deployed separately to Supabase with `npx supabase functions deploy <name>` and are not part of the Vercel deploy.

## Database schema

`supabase/migrations/` starts from a single baseline (`*_baseline.sql`) dumped from the live database on 2026-09-26. Lovable's earlier migrations were replaced because they didn't match the live history; they're in git history if needed.

- Make every schema change as a new migration: `npx supabase migration new <name>`, then `npx supabase db push`.
- Test locally first: `npx supabase start` (needs Docker) applies all migrations to a local database.
- Check for drift with `npx supabase db diff --linked --schema public` (should say "No schema changes found").
- Triggers on `auth.users` (such as `on_auth_user_created`) aren't included in public-schema dumps, so add them to migrations by hand.
- `supabase/scripts/` holds ad-hoc SQL that isn't a migration.

Regenerate types after schema changes:
`npx supabase gen types typescript --project-id bagaaqkmewkuwtudwnqw > src/integrations/supabase/types.ts`

## Workflow

- `main` is production: merging to it deploys the live site. Work on a branch and open a PR into `main`; Vercel builds a preview for each PR.
- `development` is the old Lovable working branch.
- Local dev hits the **live** database. Be careful with anything that writes data or sends email.
