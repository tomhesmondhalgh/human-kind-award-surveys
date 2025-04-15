
import React, { useEffect } from 'react';
import { SurveyFormData } from '../../types/surveyForm';
import StandardQuestions from './StandardQuestions';
import CustomQuestionsSection from './CustomQuestionsSection';
import SubmitButton from './SubmitButton';
import { useSurveyCustomQuestions } from '../../hooks/useSurveyCustomQuestions';
import { toast } from 'sonner';

interface SurveyFormContentProps {
  formData: SurveyFormData;
  surveyId: string | null;
  isSubmitting: boolean;
  handleInputChange: (key: string, value: string) => void;
  handleCustomQuestionResponse: (questionId: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SurveyFormContent: React.FC<SurveyFormContentProps> = ({
  formData,
  surveyId,
  isSubmitting,
  handleInputChange,
  handleCustomQuestionResponse,
  handleSubmit
}) => {
  const { 
    questions, 
    responses, 
    hasQuestions, 
    isLoading, 
    error, 
    handleResponse 
  } = useSurveyCustomQuestions(surveyId);
  
  // Report errors from custom questions to the user
  useEffect(() => {
    if (error) {
      console.error('Custom questions error:', error);
      toast.error(`Error loading custom questions: ${error}`);
    }
  }, [error]);
  
  // Sync our local responses with the parent's state
  const handleQuestionResponse = (questionId: string, value: string) => {
    handleResponse(questionId, value);
    handleCustomQuestionResponse(questionId, value);
  };
  
  console.log('Custom questions in SurveyFormContent:', questions);
  console.log('Has questions:', hasQuestions);
  console.log('Is loading questions:', isLoading);
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="mt-8 space-y-8"
      aria-label="Survey form"
      noValidate
    >
      {isLoading ? (
        <div className="text-center py-6" aria-live="polite" aria-busy="true">
          <p>Loading survey questions...</p>
        </div>
      ) : (
        <>
          <StandardQuestions 
            formData={formData} 
            handleInputChange={handleInputChange} 
          />
          
          <CustomQuestionsSection 
            questions={questions}
            responses={responses}
            onResponse={handleQuestionResponse}
            isLoading={isLoading}
            error={error}
          />
        </>
      )}
      
      <div className="pt-6">
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
};

export default SurveyFormContent;
