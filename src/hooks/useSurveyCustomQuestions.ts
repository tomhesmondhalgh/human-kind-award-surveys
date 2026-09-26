import { useState } from 'react';
import { CustomQuestionType } from '../types/surveyForm';

// Holds the respondent's answers to a survey's custom questions. The questions
// themselves are loaded with the survey (useSurveyData).
export function useSurveyCustomQuestions(questions: CustomQuestionType[]) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleResponse = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  return {
    questions,
    responses,
    hasQuestions: questions.length > 0,
    isLoading: false,
    error: null as string | null,
    handleResponse
  };
}
