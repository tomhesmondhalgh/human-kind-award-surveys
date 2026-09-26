-- Plan item 27 (safe part): indexes for the lookups the app and RLS policies
-- make, and removal of two duplicates. No behaviour change.

-- Every action-plan policy filters by organisation; this table had no
-- secondary indexes at all.
CREATE INDEX IF NOT EXISTS idx_action_plan_descriptors_organization_id ON public.action_plan_descriptors (organization_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_descriptors_template_id ON public.action_plan_descriptors (template_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_descriptors_user_id ON public.action_plan_descriptors (user_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_progress_notes_descriptor_id ON public.action_plan_progress_notes (descriptor_id);

-- The unique (user_id, organization_id) index can't serve "all members of an organisation".
CREATE INDEX IF NOT EXISTS idx_organization_memberships_organization_id ON public.organization_memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id ON public.organization_invitations (organization_id);
-- The invitee RLS policy matches LOWER(email) against the login email.
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email_lower ON public.organization_invitations (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_organization_group_memberships_group_id ON public.organization_group_memberships (group_id);
-- Deleting a custom question cascades to survey_questions by question_id.
CREATE INDEX IF NOT EXISTS idx_survey_questions_question_id ON public.survey_questions (question_id);

-- Duplicates: same column as idx_payment_history_payment_status and
-- idx_survey_templates_organization_id respectively (the second was misnamed).
DROP INDEX IF EXISTS public.idx_payment_history_status;
DROP INDEX IF EXISTS public.idx_survey_templates_creator_id;
