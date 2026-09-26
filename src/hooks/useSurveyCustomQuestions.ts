
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { CustomQuestionType } from '../types/surveyForm';
import { toast } from 'sonner';

export function useSurveyCustomQuestions(surveyId: string | null) {
  const [questions, setQuestions] = useState<CustomQuestionType[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const fetchCustomQuestions = async () => {
      if (!surveyId) {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('Loading custom questions for survey:', surveyId);
        
        // First, get the question IDs linked to this survey
        const { data: linkData, error: linkError } = await supabase
          .from('survey_questions')
          .select('question_id')
          .eq('survey_id', surveyId);
        
        if (linkError) {
          console.error('Error fetching question links:', linkError);
          throw new Error(`Failed to fetch question links: ${linkError.message}`);
        }
        
        console.log('Retrieved question links:', linkData);
        
        if (!linkData || linkData.length === 0) {
          console.log('No custom questions linked to survey ID:', surveyId);
          setQuestions([]);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }
        
        // Extract question IDs
        const questionIds = linkData.map(link => link.question_id);
        console.log('Question IDs to fetch:', questionIds);
        
        // Fetch the actual questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('custom_questions')
          .select('*')
          .in('id', questionIds);
        
        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
          throw new Error(`Failed to fetch questions: ${questionsError.message}`);
        }
        
        console.log('Retrieved questions data:', questionsData);
        
        if (!questionsData || questionsData.length === 0) {
          console.warn('No questions found for the given IDs');
          setQuestions([]);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }
        
        // Process questions into the expected format
        const processedQuestions = questionsData.map(q => {
          let formattedOptions: string[] = [];
          
          if (q.options) {
            if (Array.isArray(q.options)) {
              formattedOptions = q.options;
            } else if (typeof q.options === 'string') {
              try {
                const parsed = JSON.parse(q.options);
                if (Array.isArray(parsed)) {
                  formattedOptions = parsed;
                } else if (typeof parsed === 'object') {
                  // Handle object-format options
                  formattedOptions = Object.values(parsed).map(String);
                }
              } catch (e) {
                console.error('Failed to parse options string:', e, 'Original value:', q.options);
              }
            } else if (typeof q.options === 'object' && q.options !== null) {
              // Handle direct object format
              formattedOptions = Object.values(q.options).map(String);
            }
          }
          
          return {
            id: q.id,
            text: q.text,
            type: q.type || 'text',
            options: formattedOptions
          };
        });
        
        console.log('Processed custom questions:', processedQuestions);
        setQuestions(processedQuestions);
      } catch (err: any) {
        console.error('Error loading custom questions:', err);
        setError(err.message || 'Failed to load custom questions');
        // Don't show a toast here - let the parent component handle the UI notification
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    fetchCustomQuestions();
  }, [surveyId]);

  const handleResponse = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const hasQuestions = questions.length > 0;

  return {
    questions,
    responses,
    hasQuestions,
    isLoading: isLoading && !isInitialized,
    error,
    handleResponse
  };
}
