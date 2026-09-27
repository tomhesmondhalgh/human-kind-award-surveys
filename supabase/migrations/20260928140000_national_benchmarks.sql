-- Real national benchmarks (review C2). The Analysis page compared every
-- school against hard-coded figures (7.8 recommendation score, a fixed
-- 25/40/25/10 split for every question). This computes the real figures
-- across all organisations' responses.
--
-- Anonymity: only aggregates leave the function, and nothing is returned until
-- at least 5 organisations and 100 responses contribute, so no single school's
-- results can be read back out of it. Below that it returns NULL and the app
-- shows its illustrative figures, labelled as such.
--
-- Stored answers (see RatingQuestion.tsx and survey-form/constants.ts):
--   agreement questions: 'Strongly Disagree' | 'Disagree' | 'Agree' | 'Strongly Agree'
--   leaving_contemplation: 'Never' | 'Rarely' | 'Sometimes' | 'Often' | 'All the Time'
--   recommendation_score: '0'..'10' (text)
-- Matching is case- and whitespace-insensitive; anything else is ignored.

CREATE OR REPLACE FUNCTION public.get_national_benchmarks()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  min_organisations constant integer := 5;
  min_responses constant integer := 100;
  agreement constant text[] := ARRAY['Strongly Disagree', 'Disagree', 'Agree', 'Strongly Agree'];
  frequency constant text[] := ARRAY['Never', 'Rarely', 'Sometimes', 'Often', 'All the Time'];
  questions constant text[] := ARRAY['valued_member', 'leadership_prioritize', 'manageable_workload',
    'work_life_balance', 'health_state', 'support_access', 'confidence_in_role', 'org_pride'];
  total_responses integer;
  organisation_count integer;
  recommendation_average numeric;
  question_results jsonb := '{}'::jsonb;
  q text;
  dist jsonb;
BEGIN
  SELECT count(*), count(DISTINCT st.organization_id)
  INTO total_responses, organisation_count
  FROM survey_responses sr
  JOIN survey_templates st ON st.id = sr.survey_template_id;

  IF organisation_count < min_organisations OR total_responses < min_responses THEN
    RETURN NULL;
  END IF;

  SELECT round(avg(trim(sr.recommendation_score)::numeric), 1)
  INTO recommendation_average
  FROM survey_responses sr
  JOIN survey_templates st ON st.id = sr.survey_template_id
  WHERE trim(sr.recommendation_score) ~ '^([0-9]|10)(\.0+)?$';

  -- Share of each answer among the valid answers to one column (NULL when
  -- nobody has answered it).
  FOREACH q IN ARRAY questions LOOP
    EXECUTE format($f$
      WITH answers AS (
        SELECT o.option
        FROM survey_responses sr
        JOIN survey_templates st ON st.id = sr.survey_template_id
        JOIN unnest($1) AS o(option) ON lower(o.option) = lower(trim(sr.%I))
      )
      SELECT CASE WHEN max(t.total) = 0 THEN NULL
             ELSE jsonb_object_agg(o.option, COALESCE(round(c.n::numeric / t.total, 4), 0)) END
      FROM unnest($1) AS o(option)
      CROSS JOIN (SELECT count(*) AS total FROM answers) t
      LEFT JOIN (SELECT option, count(*) AS n FROM answers GROUP BY option) c ON c.option = o.option
    $f$, q)
    INTO dist
    USING agreement;
    question_results := question_results || jsonb_build_object(q, dist);
  END LOOP;

  WITH answers AS (
    SELECT o.option
    FROM survey_responses sr
    JOIN survey_templates st ON st.id = sr.survey_template_id
    JOIN unnest(frequency) AS o(option) ON lower(o.option) = lower(trim(sr.leaving_contemplation))
  )
  SELECT CASE WHEN max(t.total) = 0 THEN NULL
             ELSE jsonb_object_agg(o.option, COALESCE(round(c.n::numeric / t.total, 4), 0)) END
  INTO dist
  FROM unnest(frequency) AS o(option)
  CROSS JOIN (SELECT count(*) AS total FROM answers) t
  LEFT JOIN (SELECT option, count(*) AS n FROM answers GROUP BY option) c ON c.option = o.option;

  RETURN jsonb_build_object(
    'total_responses', total_responses,
    'organisation_count', organisation_count,
    'recommendation_average', recommendation_average,
    'questions', question_results,
    'leaving_contemplation', dist
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_national_benchmarks() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_national_benchmarks() TO authenticated;
