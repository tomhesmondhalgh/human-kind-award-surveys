# Human Kind Wellbeing Surveys

The National Staff Wellbeing Survey platform. Schools create staff wellbeing surveys, send them out, analyse the results against benchmarks and build action plans from them.

See [AppDescription.md](AppDescription.md) for a fuller description of the features.

## Stack

- React 18 + TypeScript, built with Vite
- Tailwind CSS and shadcn/ui components
- Supabase for the database, logins and server-side edge functions
- Stripe for payments, Resend for email, HubSpot for CRM, OpenAI for survey summaries
- Hosted on Netlify, deployed from GitHub

## Running locally

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

The site runs at http://localhost:8080. It connects to the live Supabase project, so anything you do locally uses real data.

Tests: `npm test` (Vitest) and `npm run test:e2e` (Playwright).

## Deploying

The site is hosted on Netlify. Day-to-day work happens on the `development` branch, with feature branches merged into it through pull requests.

Supabase edge functions in `supabase/functions/` are deployed separately with the Supabase CLI:

```sh
npx supabase functions deploy <function-name>
```
