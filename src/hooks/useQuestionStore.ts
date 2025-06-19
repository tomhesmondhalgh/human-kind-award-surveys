
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { CustomQuestion } from '../types/customQuestions';
import { fixCustomQuestionTypes } from '../utils/typeConversions';

export const useQuestionStore = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async (showArchived: boolean = false) => {
    if (!user) {
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('custom_questions')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (!showArchived) {
        query = query.eq('archived', false);
      }

      const { data, error } = await query;

      if (error) {
        setError(error.message);
        return [];
      } else {
        const convertedQuestions = fixCustomQuestionTypes(data || []);
        setQuestions(convertedQuestions);
        return convertedQuestions;
      }
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [user]);

  const createQuestion = async (question: Omit<CustomQuestion, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('custom_questions')
        .insert([question])
        .select();

      if (error) {
        setError(error.message);
        return null;
      } else if (data) {
        const convertedQuestion = fixCustomQuestionTypes(data)[0];
        setQuestions([...questions, convertedQuestion]);
        return convertedQuestion;
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const updateQuestion = async (id: string, updates: Partial<CustomQuestion>) => {
    try {
      const { data, error } = await supabase
        .from('custom_questions')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        setError(error.message);
      } else if (data) {
        const convertedQuestion = fixCustomQuestionTypes(data)[0];
        setQuestions(questions.map(q => (q.id === id ? convertedQuestion : q)));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_questions')
        .delete()
        .eq('id', id);

      if (error) {
        setError(error.message);
      } else {
        setQuestions(questions.filter(q => q.id !== id));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    questions,
    isLoading,
    error,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  };
};
