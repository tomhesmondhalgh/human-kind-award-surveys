
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { CustomQuestion } from '@/types/customQuestions';
import { queryTable } from '@/utils/supabaseHelpers';

interface CustomQuestionsContextType {
  questions: CustomQuestion[];
  loading: boolean;
  error: string | null;
  refreshQuestions: () => Promise<void>;
}

const CustomQuestionsContext = createContext<CustomQuestionsContextType | undefined>(undefined);

export const useCustomQuestions = () => {
  const context = useContext(CustomQuestionsContext);
  if (context === undefined) {
    throw new Error('useCustomQuestions must be used within a CustomQuestionsProvider');
  }
  return context;
};

interface CustomQuestionsProviderProps {
  children: ReactNode;
}

export const CustomQuestionsProvider: React.FC<CustomQuestionsProviderProps> = ({ children }) => {
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const fetchQuestions = async () => {
    if (!user || !currentOrganization) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await queryTable<CustomQuestion>(
        'custom_questions',
        '*',
        { 
          organization_id: currentOrganization.id,
          archived: false 
        }
      );

      if (fetchError) {
        throw fetchError;
      }

      setQuestions(data || []);
    } catch (err: any) {
      console.error('Error fetching custom questions:', err);
      setError(err.message);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuestions = async () => {
    await fetchQuestions();
  };

  useEffect(() => {
    fetchQuestions();
  }, [user, currentOrganization]);

  const value = {
    questions,
    loading,
    error,
    refreshQuestions,
  };

  return (
    <CustomQuestionsContext.Provider value={value}>
      {children}
    </CustomQuestionsContext.Provider>
  );
};
