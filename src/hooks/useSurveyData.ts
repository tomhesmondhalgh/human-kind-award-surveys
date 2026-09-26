import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { getSurveyById } from '../utils/survey/templates';
import { isSurveyClosed } from '../utils/survey/status';
import { SurveyTemplate } from '../utils/types/survey';
import { CustomQuestionType } from '../types/surveyForm';
import { toast } from 'sonner';

type RawQuestion = { id: string; text: string; type: string | null; options: unknown };

// custom_questions.options is usually a text[] but some older rows hold a JSON
// string or object.
function parseOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.map(String);
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  if (options && typeof options === 'object') return Object.values(options).map(String);
  return [];
}

const toQuestion = (q: RawQuestion): CustomQuestionType => ({
  id: q.id,
  text: q.text,
  type: q.type || 'text',
  options: parseOptions(q.options),
});

/**
 * Loads a survey for the respondent form. Respondents aren't logged in, so the
 * survey and its questions come from the get_public_survey function. Drafts
 * aren't public; organisation members previewing one read the tables directly.
 */
async function loadSurvey(surveyId: string): Promise<{ template: SurveyTemplate; questions: CustomQuestionType[] } | null> {
  const { data, error } = await supabase.rpc('get_public_survey', { p_survey_id: surveyId });
  if (error) throw error;

  if (data) {
    const survey = data as unknown as SurveyTemplate & { questions: RawQuestion[] };
    const { questions, ...template } = survey;
    return { template, questions: questions.map(toQuestion) };
  }

  const template = await getSurveyById(surveyId);
  if (!template) return null;

  const { data: links, error: linkError } = await supabase
    .from('survey_questions')
    .select('custom_questions:question_id (id, text, type, options)')
    .eq('survey_id', surveyId);
  if (linkError) throw linkError;

  const questions = (links ?? [])
    .map((link) => link.custom_questions as RawQuestion | null)
    .filter((q): q is RawQuestion => !!q)
    .map(toQuestion);
  return { template, questions };
}

function closedMessage(status: string | undefined): string {
  switch (status) {
    case 'Archived':
      return 'This survey has been archived and is no longer accepting responses';
    case 'Completed':
      return 'This survey has been completed and is no longer accepting responses';
    case 'Scheduled':
      return 'This survey is not yet open for responses';
    default:
      return 'This survey is not currently accepting responses';
  }
}

export function useSurveyData(surveyId: string | null, isPreview: boolean) {
  const [isLoading, setIsLoading] = useState(true);
  const [surveyName, setSurveyName] = useState('Wellbeing Survey');
  const [surveyData, setSurveyData] = useState<SurveyTemplate | null>(null);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      setIsLoading(false);
      setError('No survey ID provided');
      return;
    }

    let cancelled = false;

    const fetchSurveyData = async () => {
      try {
        const survey = await loadSurvey(surveyId);
        if (cancelled) return;

        if (!survey) {
          setError(`Survey with ID ${surveyId} not found`);
          return;
        }

        const { template, questions } = survey;
        if (!isPreview && template.status !== 'Sent') {
          setError(closedMessage(template.status));
          return;
        }
        if (!isPreview && isSurveyClosed(template)) {
          setError('This survey has closed');
          return;
        }

        setSurveyName(template.name);
        setSurveyData(template);
        setCustomQuestions(questions);
      } catch (err) {
        console.error('Error fetching survey data:', err);
        if (cancelled) return;
        toast.error('Failed to load survey');
        setError('Error loading survey data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSurveyData();
    return () => {
      cancelled = true;
    };
  }, [surveyId, isPreview]);

  return {
    isLoading,
    surveyName,
    surveyData,
    customQuestions,
    error
  };
}
