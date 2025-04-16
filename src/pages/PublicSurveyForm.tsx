
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSurveyData } from '../hooks/useSurveyData';
import { useSurveyForm } from '../hooks/useSurveyForm';
import SurveyLoading from '../components/survey-form/SurveyLoading';
import SurveyNotFound from '../components/survey-form/SurveyNotFound';
import SurveyFormWrapper from '../components/survey-form/SurveyFormWrapper';
import { CustomQuestionsProvider } from '../contexts/CustomQuestionsContext'; 
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';

const PublicSurveyForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const surveyId = searchParams.get('id');
  const isPreview = searchParams.get('preview') === 'true';
  
  const { 
    isLoading, 
    surveyData,
    error
  } = useSurveyData(surveyId, isPreview);
  
  const {
    formData,
    isSubmitting,
    handleInputChange,
    handleCustomQuestionResponse,
    submitForm
  } = useSurveyForm(surveyId, isPreview);
  
  useEffect(() => {
    if (surveyId) {
      console.log(`Public survey form loaded with ID: ${surveyId}, preview mode: ${isPreview}`);
      console.log(`Using anonymous client for survey submissions`);
    } else {
      console.error('No survey ID provided in URL parameters');
    }
    
    if (surveyId && surveyData) {
      console.log(`Survey data loaded for ID: ${surveyId}`);
    }
  }, [surveyId, surveyData, isPreview]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form with data:', formData);
    console.log('Custom responses being submitted:', formData.custom_responses);
    
    try {
      // Note: The actual validation happens in SurveyFormContent before this function is called
      const success = await submitForm(navigate);
      if (success) {
        toast.success('Survey submitted successfully');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Failed to submit survey');
    }
  };
  
  if (isLoading) {
    return <SurveyLoading />;
  }
  
  if (!surveyId || !surveyData || error) {
    return <SurveyNotFound errorMessage={error || undefined} />;
  }
  
  return (
    <CustomQuestionsProvider>
      <SurveyFormWrapper
        surveyTemplate={surveyData}
        formData={formData}
        surveyId={surveyId}
        isSubmitting={isSubmitting}
        isPreview={isPreview}
        handleInputChange={handleInputChange}
        handleCustomQuestionResponse={handleCustomQuestionResponse}
        handleSubmit={handleSubmit}
      />
    </CustomQuestionsProvider>
  );
};

export default PublicSurveyForm;
