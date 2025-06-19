
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { CustomQuestion } from '../types/customQuestions';
import { fixCustomQuestionTypes } from '../utils/typeConversions';

interface CustomQuestionsContextType {
  customQuestions: CustomQuestion[];
  setCustomQuestions: React.Dispatch<React.SetStateAction<CustomQuestion[]>>;
  isLoading: boolean;
  error: string | null;
  fetchCustomQuestions: () => Promise<void>;
}

const CustomQuestionsContext = createContext<CustomQuestionsContextType | undefined>(undefined);

export const useCustomQuestions = () => {
  const context = useContext(CustomQuestionsContext);
  if (!context) {
    throw new Error('useCustomQuestions must be used within a CustomQuestionsProvider');
  }
  return context;
};

interface CustomQuestionsProviderProps {
  children: ReactNode;
}

export const CustomQuestionsProvider: React.FC<CustomQuestionsProviderProps> = ({ children }) => {
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCustomQuestions = async () => {
    if (!user) {
      console.log('No user found, not fetching custom questions');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('custom_questions')
        .select('*')
        .eq('creator_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching custom questions:', error);
        setError(error.message);
      } else {
        const convertedQuestions = fixCustomQuestionTypes(data || []);
        setCustomQuestions(convertedQuestions);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching custom questions:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomQuestions();
  }, [user]);

  const value: CustomQuestionsContextType = {
    customQuestions,
    setCustomQuestions,
    isLoading,
    error,
    fetchCustomQuestions,
  };

  return (
    <CustomQuestionsContext.Provider value={value}>
      {children}
    </CustomQuestionsContext.Provider>
  );
};
