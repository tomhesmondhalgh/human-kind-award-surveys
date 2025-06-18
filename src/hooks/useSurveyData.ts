
import { useState, useEffect } from 'react';
import { getSurveyById } from '../utils/survey/templates';
import { isSurveyClosed } from '../utils/survey/status';
import { SurveyTemplate } from '../utils/types/survey';
import { CustomQuestionType } from '../types/surveyForm';
import { toast } from 'sonner';
import { queryTable } from '@/utils/supabaseHelpers';
import { supabase } from '../integrations/supabase/client';

export function useSurveyData(surveyId: string | null, isPreview: boolean) {
  const [isLoading, setIsLoading] = useState(true);
  const [surveyName, setSurveyName] = useState('Wellbeing Survey');
  const [surveyData, setSurveyData] = useState<SurveyTemplate | null>(null);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      console.log('No survey ID provided');
      setIsLoading(false);
      setError('No survey ID provided');
      return;
    }
    
    console.log(`Attempting to fetch survey with ID: ${surveyId}`);
    
    const fetchSurveyData = async () => {
      try {
        console.log('Starting to fetch survey data for ID:', surveyId);
        const surveyTemplate = await getSurveyById(surveyId);
        
        if (!surveyTemplate) {
          console.error(`Survey not found with ID: ${surveyId}`);
          setIsLoading(false);
          setError(`Survey with ID ${surveyId} not found`);
          return;
        }
        
        if (isSurveyClosed(surveyTemplate) && !isPreview) {
          console.log(`Survey ${surveyId} is closed and not in preview mode`);
          setIsLoading(false);
          setError('This survey has closed');
          return { isClosed: true };
        }
        
        console.log(`Successfully loaded survey: ${surveyTemplate.name}`);
        setSurveyName(surveyTemplate.name);
        setSurveyData(surveyTemplate);
        
        // Fetch custom questions
        console.log('Fetching custom questions for survey ID:', surveyId);
        
        // Query both tables directly with a join to ensure we get all data in one request
        const { data: joinedData, error: joinError } = await supabase
          .from('survey_questions')
          .select(`
            id,
            question_id,
            survey_id,
            custom_questions:question_id (
              id, 
              text,
              type,
              options
            )
          `)
          .eq('survey_id', surveyId as any);
        
        if (joinError) {
          console.error('Error fetching linked questions with join:', joinError);
          
          // Try a direct query approach instead
          console.log('Trying direct manual queries as fallback');
          return await fetchQuestionsDirectly(surveyId);
        }
        
        console.log('JOIN QUERY RESULTS:', joinedData);
        
        if (!joinedData || joinedData.length === 0) {
          console.log('No linked questions found in join query');
          setCustomQuestions([]);
          setIsLoading(false);
          return { isClosed: false };
        }
        
        // Extract and format the questions from the join results
        const questionsFromJoin = joinedData
          .filter((item: any) => item && typeof item === 'object' && 'custom_questions' in item && item.custom_questions) // Filter out any null results
          .map((item: any) => {
            const q = item.custom_questions;
            
            // Ensure options are properly formatted
            let formattedOptions: string[] = [];
            if (q?.options) {
              if (Array.isArray(q.options)) {
                formattedOptions = q.options;
              } else if (typeof q.options === 'string') {
                try {
                  const parsed = JSON.parse(q.options);
                  if (Array.isArray(parsed)) {
                    formattedOptions = parsed;
                  }
                } catch (e) {
                  console.error('Failed to parse options string:', e);
                }
              }
            }
            
            return {
              id: q.id,
              text: q.text,
              type: q.type || 'text',
              options: formattedOptions
            };
          });
        
        console.log('Formatted questions from join:', questionsFromJoin);
        
        setCustomQuestions(questionsFromJoin);
        setIsLoading(false);
        return { isClosed: false };
        
      } catch (error) {
        console.error('Error fetching survey data:', error);
        toast.error('Failed to load survey');
        setIsLoading(false);
        setError('Error loading survey data');
        return { isClosed: false };
      }
    };
    
    const fetchQuestionsDirectly = async (surveyId: string) => {
      try {
        console.log('ATTEMPTING DIRECT QUERY APPROACH');
        
        // STEP 1: Get all question IDs linked to this survey
        console.log('STEP 1: Get all question IDs linked to this survey');
        const { data: linkData, error: linkError } = await queryTable(
          'survey_questions',
          'question_id',
          { survey_id: surveyId as any }
        );
        
        if (linkError || !linkData || linkData.length === 0) {
          console.error('Direct query - No links found or error:', linkError);
          setCustomQuestions([]);
          setIsLoading(false);
          return { isClosed: false };
        }
        
        console.log('Direct query - Link data:', linkData);
        const questionIds = linkData.map((link: any) => link.question_id);
        
        // STEP 2: Get the actual question data for these IDs
        console.log('STEP 2: Get the actual question data for these IDs');
        const { data: questionsData, error: questionsError } = await supabase
          .from('custom_questions')
          .select('*')
          .in('id', questionIds);
        
        if (questionsError || !questionsData || questionsData.length === 0) {
          console.error('Direct query - No questions found or error:', questionsError);
          setCustomQuestions([]);
          setIsLoading(false);
          return { isClosed: false };
        }
        
        console.log('Direct query - Questions data:', questionsData);
        
        // Format the questions to match our expected format
        const formattedQuestions = questionsData.map((q: any) => {
          let options: string[] = [];
          
          // Handle options based on what type it actually is
          if (q.options) {
            console.log('Processing options for question:', q.id, 'Options type:', typeof q.options);
            console.log('Raw options value:', q.options);
            
            if (Array.isArray(q.options)) {
              options = q.options;
            } else if (typeof q.options === 'string') {
              try {
                const parsed = JSON.parse(q.options);
                if (Array.isArray(parsed)) {
                  options = parsed;
                }
              } catch (e) {
                console.error('Failed to parse options string for question', q.id, e);
              }
            } else if (typeof q.options === 'object') {
              console.log('Options is an object, attempting to convert');
              try {
                // If it's already a JSON object, try to get values
                const values = Object.values(q.options);
                if (Array.isArray(values)) {
                  options = values.map(v => String(v));
                }
              } catch (e) {
                console.error('Failed to extract values from options object', e);
              }
            }
          }
          
          const result = {
            id: q.id,
            text: q.text,
            type: q.type || 'text',
            options: options
          };
          
          console.log('Formatted question:', result);
          return result;
        });
        
        console.log('Final formatted questions from direct query:', formattedQuestions);
        setCustomQuestions(formattedQuestions);
        setIsLoading(false);
        return { isClosed: false };
      } catch (error) {
        console.error('Error in direct query approach:', error);
        setIsLoading(false);
        return { isClosed: false };
      }
    };
    
    fetchSurveyData().then(result => {
      if (result?.isClosed) {
        // We'll handle navigation in the parent component
      }
    });
  }, [surveyId, isPreview]);

  return {
    isLoading,
    surveyName,
    surveyData,
    customQuestions,
    error
  };
}
