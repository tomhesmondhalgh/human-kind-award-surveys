-- Phase 2 of REMEDIATION_PLAN.md: survey closure emails.
--
-- A scheduled job (supabase/scripts/schedule_closure_notifications.sql) calls
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
