
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { CustomQuestionType } from '../types/surveyForm';
import { getCacheItem, setCacheItem, clearCacheItem } from '@/utils/cache/cacheUtils';
import { selectQuery } from '@/lib/supabase/queryUtils';
import { SurveyQuestionData, CustomQuestionData } from '@/types/supabase-overrides';

interface CustomQuestionsContextType {
  questions: CustomQuestionType[];
  isLoading: boolean;
  error: string | null;
  loadQuestions: (surveyId: string) => Promise<void>;
  refreshQuestions: (surveyId: string) => Promise<void>;
}

const CustomQuestionsContext = createContext<CustomQuestionsContextType>({
  questions: [],
  isLoading: false,
  error: null,
  loadQuestions: async () => {},
  refreshQuestions: async () => {}
});

export const useCustomQuestions = () => useContext(CustomQuestionsContext);

interface CustomQuestionsProviderProps {
  children: ReactNode;
}

export const CustomQuestionsProvider: React.FC<CustomQuestionsProviderProps> = ({ children }) => {
  const [questions, setQuestions] = useState<CustomQuestionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = async (surveyId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading custom questions for survey:', surveyId);
      
      // Check cache first
      const cacheKey = `survey_custom_questions_${surveyId}`;
      const cachedQuestions = getCacheItem<CustomQuestionType[]>(cacheKey);
      
      if (cachedQuestions) {
        console.log('Using cached custom questions for survey:', surveyId);
        setQuestions(cachedQuestions);
        setIsLoading(false);
        return;
      }
      
      // First get the question IDs linked to this survey
      const { data: linkedQuestions, error: linkError } = await selectQuery<SurveyQuestionData>(
        'survey_questions',
        'question_id',
        { survey_id: surveyId }
      );
        
      if (linkError) {
        console.error('Error fetching linked questions:', linkError);
        throw new Error(`Failed to fetch linked questions: ${linkError.message}`);
      }
      
      if (!linkedQuestions || linkedQuestions.length === 0) {
        console.log('No custom questions linked to this survey');
        setQuestions([]);
        return;
      }
      
      const questionIds = linkedQuestions.map(q => q.question_id);
      console.log('Found question IDs:', questionIds);
      
      // Now fetch the actual question data
      const { data, error } = await supabase
        .from('custom_questions')
        .select('*')
        .in('id', questionIds as any);
        
      if (error) {
        console.error('Error fetching questions data:', error);
        throw new Error(`Failed to fetch questions data: ${error.message}`);
      }
      
      if (!data) {
        console.log('No question data found');
        setQuestions([]);
        return;
      }
      
      // Process the question data to ensure proper typing
      const formattedQuestions: CustomQuestionType[] = data.map((q: any) => {
        let options: string[] = [];
        
        // Process options based on their actual format
        if (q.options) {
          if (Array.isArray(q.options)) {
            options = q.options;
          } else if (typeof q.options === 'string') {
            try {
              const parsed = JSON.parse(q.options);
              if (Array.isArray(parsed)) {
                options = parsed;
              }
            } catch (e) {
              console.error('Failed to parse options:', e);
            }
          }
        }
        
        return {
          id: q.id,
          text: q.text,
          type: q.type || 'text',
          options: options
        };
      });
      
      console.log('Formatted questions:', formattedQuestions);
      setQuestions(formattedQuestions);
      
      // Cache the results
      setCacheItem(cacheKey, formattedQuestions, 600); // Cache for 10 minutes
      
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load custom questions';
      console.error('Error in loadQuestions:', errorMessage);
      setError(errorMessage);
      toast.error('Failed to load custom questions');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQuestions = async (surveyId: string) => {
    clearCacheItem(`survey_custom_questions_${surveyId}`);
    await loadQuestions(surveyId);
  };

  return (
    <CustomQuestionsContext.Provider value={{ 
      questions, 
      isLoading, 
      error, 
      loadQuestions, 
      refreshQuestions 
    }}>
      {children}
    </CustomQuestionsContext.Provider>
  );
};
