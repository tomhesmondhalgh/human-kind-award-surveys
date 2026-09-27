import React, { useEffect, useState } from 'react';
import { CustomQuestionType, SurveyFormData } from '../../types/surveyForm';
import StandardQuestions from './StandardQuestions';
import CustomQuestionsSection from './CustomQuestionsSection';
import SubmitButton from './SubmitButton';
import SurveyProgress from './SurveyProgress';
import { useSurveyCustomQuestions } from '../../hooks/useSurveyCustomQuestions';
import { getRequiredProgress, getValidationErrors } from './validation';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SurveyFormContentProps {
  formData: SurveyFormData;
  customQuestions: CustomQuestionType[];
  isSubmitting: boolean;
  handleInputChange: (key: string, value: string) => void;
  handleCustomQuestionResponse: (questionId: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SurveyFormContent: React.FC<SurveyFormContentProps> = ({
  formData,
  customQuestions,
  isSubmitting,
  handleInputChange,
  handleCustomQuestionResponse,
  handleSubmit
}) => {
  // Errors only show after the first submit attempt; from then on they're
  // recalculated live, so each one clears as soon as it's answered.
  const [showErrors, setShowErrors] = useState(false);

  const {
    questions,
    responses,
    isLoading,
    error,
    handleResponse
  } = useSurveyCustomQuestions(customQuestions);

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

  const currentErrors = getValidationErrors(formData, questions);
  const validationErrors = showErrors ? currentErrors : [];
  const progress = getRequiredProgress(formData, questions);

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentErrors.length > 0) {
      setShowErrors(true);
      // Scroll to the top to show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    handleSubmit(e);
  };

  return (
    <>
      {!isLoading && <SurveyProgress answered={progress.answered} total={progress.total} />}

      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Please complete the following required fields:</div>
            <ul className="list-disc pl-5 mt-2">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={validateAndSubmit}
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
              validationErrors={validationErrors}
            />

            <CustomQuestionsSection
              questions={questions}
              responses={responses}
              onResponse={handleQuestionResponse}
              isLoading={isLoading}
              error={error}
              validationErrors={validationErrors}
            />
          </>
        )}

        <div className="pt-6">
          <SubmitButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </>
  );
};

export default SurveyFormContent;
