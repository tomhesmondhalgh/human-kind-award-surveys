import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuestionUsage {
  questionId: string;
  surveyCount: number;
  surveyNames: string[];
}

export function useQuestionUsage(questionId: string) {
  const [usage, setUsage] = useState<QuestionUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setIsLoading(true);
        
        // Get all survey_questions entries for this question
        const { data: surveyQuestions, error: sqError } = await supabase
          .from('survey_questions')
          .select('survey_id')
          .eq('question_id', questionId);

        if (sqError) throw sqError;

        if (!surveyQuestions || surveyQuestions.length === 0) {
          setUsage({
            questionId,
            surveyCount: 0,
            surveyNames: []
          });
          return;
        }

        // Get survey names
        const surveyIds = surveyQuestions.map(sq => sq.survey_id);
        const { data: surveys, error: surveysError } = await supabase
          .from('survey_templates')
          .select('id, name')
          .in('id', surveyIds);

        if (surveysError) throw surveysError;

        setUsage({
          questionId,
          surveyCount: surveys?.length || 0,
          surveyNames: surveys?.map(s => s.name) || []
        });
      } catch (error) {
        console.error('Error fetching question usage:', error);
        setUsage(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (questionId) {
      fetchUsage();
    }
  }, [questionId]);

  return { usage, isLoading };
}
