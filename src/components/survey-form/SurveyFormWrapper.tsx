
import React from 'react';
import { SurveyTemplate } from '../../utils/types/survey';
import { SurveyFormData } from '../../types/surveyForm';
import SurveyIntro from './SurveyIntro';
import SurveyFormContent from './SurveyFormContent';
import PreviewModeFooter from './PreviewModeFooter';

interface SurveyFormWrapperProps {
  surveyTemplate: SurveyTemplate;
  formData: SurveyFormData;
  surveyId: string | null;
  isSubmitting: boolean;
  isPreview: boolean;
  handleInputChange: (key: string, value: string) => void;
  handleCustomQuestionResponse: (questionId: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SurveyFormWrapper: React.FC<SurveyFormWrapperProps> = ({
  surveyTemplate,
  formData,
  surveyId,
  isSubmitting,
  isPreview,
  handleInputChange,
  handleCustomQuestionResponse,
  handleSubmit
}) => {
  return (
    <main 
      className="min-h-screen bg-gradient-to-b from-white to-purple-50"
      role="main"
      aria-labelledby="survey-title"
    >
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white shadow-md rounded-lg p-6 md:p-8 border border-purple-100">
          <SurveyIntro surveyTemplate={surveyTemplate} />
          
          <SurveyFormContent
            formData={formData}
            surveyId={surveyId}
            isSubmitting={isSubmitting}
            handleInputChange={handleInputChange}
            handleCustomQuestionResponse={handleCustomQuestionResponse}
            handleSubmit={handleSubmit}
          />
          
          {isPreview && (
            <div aria-live="polite">
              <PreviewModeFooter />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default SurveyFormWrapper;
