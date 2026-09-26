-- Respondents open survey links without logging in. Since October 2025 the
-- public_survey_templates view has been security_invoker, and survey_templates,
-- survey_questions and custom_questions only let organisation members read
-- them, so logged-out respondents got "survey not found".
--
-- This function returns only what the survey form needs: the survey's name,
-- dates and status, and its custom questions. Draft ('Saved') surveys are not
-- returned. Respondents still submit through the submit-survey-response edge
-- function, which checks the survey is open.
CREATE OR REPLACE FUNCTION public.get_public_survey(p_survey_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', st.id,
    'name', st.name,
    'date', st.date,
    'close_date', st.close_date,
    'status', st.status,
    'questions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('id', cq.id, 'text', cq.text, 'type', cq.type, 'options', cq.options)
        ORDER BY sq.created_at, cq.id
      )
      FROM survey_questions sq
      JOIN custom_questions cq ON cq.id = sq.question_id
      WHERE sq.survey_id = st.id
    ), '[]'::jsonb)
  )
  FROM survey_templates st
  WHERE st.id = p_survey_id
    AND st.status <> 'Saved';
$$;

REVOKE ALL ON FUNCTION public.get_public_survey(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_survey(uuid) TO anon, authenticated, service_role;

-- The view only served logged-out visitors and returned nothing for them.
DROP VIEW IF EXISTS public.public_survey_templates;
