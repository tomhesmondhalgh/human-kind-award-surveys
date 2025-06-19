
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { CustomQuestion } from '../types/customQuestions';

export const useSurveyData = (surveyId: string | null) => {
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    const fetchCustomQuestions = async () => {
      if (!surveyId || !currentOrganization?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch custom questions associated with the survey
        const { data, error } = await supabase
          .from('custom_questions')
          .select('*')
          .eq('survey_template_id', surveyId);

        if (error) {
          console.error('Error fetching custom questions:', error);
          setError(error.message);
          return;
        }

        // Simple type conversion without using the utility function to avoid deep instantiation
        const convertedQuestions: CustomQuestion[] = (data || []).map(question => ({
          id: question.id,
          text: question.text,
          type: question.type === 'multiple_choice' ? 'multiple_choice' : 'text',
          options: Array.isArray(question.options) ? question.options : [],
          created_at: question.created_at,
          archived: Boolean(question.archived),
          creator_id: question.creator_id,
          organization_id: question.organization_id
        }));
        
        setCustomQuestions(convertedQuestions);
      } catch (err: any) {
        console.error('Error fetching custom questions:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomQuestions();
  }, [surveyId, currentOrganization?.id, user?.id]);

  return {
    customQuestions,
    isLoading,
    error,
  };
};
