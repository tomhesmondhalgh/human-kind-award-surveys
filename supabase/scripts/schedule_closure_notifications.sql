-- One-off setup: run once in the Supabase SQL editor after deploying
-- send-closure-notification. Schedules the hourly survey-closure emails.
--
-- Before running:
--   1. Generate a long random secret (e.g. `openssl rand -hex 32`).
--   2. Give it to the function:
--        npx supabase secrets set CLOSURE_CRON_SECRET="<secret>"
--   3. Replace <secret> below with the same value. It's stored encrypted in
--      Supabase Vault; don't commit it anywhere.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<secret>', 'closure_cron_secret');

select cron.schedule(
  'send-closure-notifications',
  '5 * * * *', -- five past every hour
  $$
  select net.http_post(
    url := 'https://bagaaqkmewkuwtudwnqw.supabase.co/functions/v1/send-closure-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'closure_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To check it's running:  select * from cron.job_run_details order by start_time desc limit 5;
-- To see the calls:        select * from net._http_response order by created desc limit 5;
-- To stop it:              select cron.unschedule('send-closure-notifications');
