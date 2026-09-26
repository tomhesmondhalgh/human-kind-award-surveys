-- Phase 2 of REMEDIATION_PLAN.md: survey closure emails.
--
-- A pg_cron job (set up at the end of this file) calls
-- send-closure-notification every hour. It emails the organisation's admins
-- about each survey that has closed and sets closure_notified_at, so each
-- survey is announced exactly once.

ALTER TABLE public.survey_templates
  ADD COLUMN closure_notified_at timestamp with time zone;

-- Don't announce surveys that closed before this existed.
UPDATE public.survey_templates
SET closure_notified_at = now()
WHERE close_date IS NOT NULL AND close_date <= now();

-- The job's query: closed, not yet announced.
CREATE INDEX idx_survey_templates_closure_pending
  ON public.survey_templates (close_date)
  WHERE closure_notified_at IS NULL AND close_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- The hourly job. The shared secret the job sends is generated here, inside the
-- database, and kept in Vault: it never appears in the repo or anywhere else.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'closure_cron_secret',
  'Sent by the send-closure-notifications cron job; checked by the edge function'
)
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'closure_cron_secret');

-- The edge function (service role) asks this whether a request carries the secret.
CREATE OR REPLACE FUNCTION public.is_valid_closure_cron_secret(candidate text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'closure_cron_secret' AND decrypted_secret = candidate
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_valid_closure_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_closure_cron_secret(text) TO service_role;

-- Five past every hour. cron.schedule replaces an existing job of the same name.
SELECT cron.schedule(
  'send-closure-notifications',
  '5 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://bagaaqkmewkuwtudwnqw.supabase.co/functions/v1/send-closure-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'closure_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
