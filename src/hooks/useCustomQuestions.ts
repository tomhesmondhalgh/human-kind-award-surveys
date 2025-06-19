
import { useEffect, useState } from 'react';
import { useQuestionStore } from './useQuestionStore';

export function useCustomQuestions() {
  const { questions, isLoading, fetchQuestions, createQuestion, updateQuestion } = useQuestionStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      await fetchQuestions(false);
      setInitialLoadDone(true);
    };
    loadQuestions();
  }, [refreshTrigger]);

  const refreshQuestions = async () => {
    try {
      const questions = await fetchQuestions(false);
      if (questions.length >= 0) { // Check if fetch was successful
        setRefreshTrigger(prev => prev + 1);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing questions:', error);
      return false;
    }
  };

  return {
    questions,
    isLoading: isLoading && !initialLoadDone,
    refreshQuestions,
    createQuestion,
    updateQuestion
  };
}
