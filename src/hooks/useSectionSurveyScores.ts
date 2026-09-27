import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  FRAMEWORK_QUESTION_FIELDS,
  MIN_RESPONSES_FOR_SECTION_SCORES,
  SectionScore,
  SurveyAnswerRow,
  computeSectionScores,
  pickFocusAreas,
} from '../utils/surveyFramework';

export interface SectionSurveyScores {
  survey: { id: string; name: string; date: string; responseCount: number };
  scores: SectionScore[];
  focusAreas: string[];
}

// How many recent surveys to check for one with enough responses.
const SURVEYS_TO_CHECK = 10;

// Section scores from the organisation's most recent survey with enough
// responses, or null if there isn't one.
export async function fetchSectionSurveyScores(organizationId: string): Promise<SectionSurveyScores | null> {
  const { data: surveys, error } = await supabase
    .from('survey_templates')
    .select('id, name, date')
    .eq('organization_id', organizationId)
    .lte('date', new Date().toISOString())
    .order('date', { ascending: false })
    .limit(SURVEYS_TO_CHECK);
  if (error) throw error;

  for (const survey of surveys ?? []) {
    const { data: rows, error: responsesError } = await supabase
      .from('survey_responses')
      .select(FRAMEWORK_QUESTION_FIELDS.join(', '))
      .eq('survey_template_id', survey.id);
    if (responsesError) throw responsesError;
    const answers = (rows ?? []) as unknown as SurveyAnswerRow[];
    if (answers.length < MIN_RESPONSES_FOR_SECTION_SCORES) continue;

    const scores = computeSectionScores(answers);
    return {
      survey: { ...survey, responseCount: answers.length },
      scores,
      focusAreas: pickFocusAreas(scores),
    };
  }
  return null;
}

export function useSectionSurveyScores(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['section-survey-scores', organizationId],
    queryFn: () => fetchSectionSurveyScores(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
