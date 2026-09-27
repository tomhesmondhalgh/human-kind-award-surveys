
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuestionStore } from './useQuestionStore';

export function useCustomQuestions() {
  const { questions, isLoading, fetchQuestions, createQuestion, updateQuestion } = useQuestionStore();
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // fetchQuestions is recreated on every render; keep the latest in a ref so
  // refreshQuestions stays stable and effects depending on it don't loop.
  const fetchRef = useRef(fetchQuestions);
  fetchRef.current = fetchQuestions;

  useEffect(() => {
    const loadQuestions = async () => {
      await fetchRef.current(false);
      setInitialLoadDone(true);
    };
    loadQuestions();
  }, []);

  const refreshQuestions = useCallback(async () => {
    try {
      await fetchRef.current(false);
      return true;
    } catch (error) {
      console.error('Error refreshing questions:', error);
      return false;
    }
  }, []);

  return {
    questions,
    isLoading: isLoading && !initialLoadDone,
    refreshQuestions,
    createQuestion,
    updateQuestion
  };
}
