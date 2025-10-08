import { useState } from 'react';
import { SurveyFormData } from '../types/surveyForm';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

const initialFormData: SurveyFormData = {
  role: '',
  leadership_prioritize: '',
  manageable_workload: '',
  work_life_balance: '',
  health_state: '',
  valued_member: '',
  support_access: '',
  confidence_in_role: '',
  org_pride: '',
  recommendation_score: '',
  leaving_contemplation: '',
  doing_well: '',
  improvements: '',
  custom_responses: {}
};

export const useSurveyForm = (surveyId: string | null, isPreview: boolean) => {
  const [formData, setFormData] = useState<SurveyFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCustomQuestionResponse = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      custom_responses: {
        ...prev.custom_responses,
        [questionId]: value
      }
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const submitForm = async (navigate: (path: string) => void) => {
    if (!surveyId) {
      toast.error('Survey ID is missing');
      return false;
    }

    if (isPreview) {
      console.log('Preview mode - form submission skipped');
      toast.info('Preview mode - responses not saved');
      return false;
    }

    setIsSubmitting(true);

    try {
      // Prepare the submission data
      const submissionData = {
        survey_id: surveyId,
        role: formData.role,
        leadership_prioritize: formData.leadership_prioritize,
        manageable_workload: formData.manageable_workload,
        work_life_balance: formData.work_life_balance,
        health_state: formData.health_state,
        valued_member: formData.valued_member,
        support_access: formData.support_access,
        confidence_in_role: formData.confidence_in_role,
        org_pride: formData.org_pride,
        recommendation_score: formData.recommendation_score || null,
        leaving_contemplation: formData.leaving_contemplation,
        doing_well: formData.doing_well || null,
        improvements: formData.improvements || null,
        submitted_at: new Date().toISOString()
      };

      console.log('Submitting survey response:', submissionData);

      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert([submissionData])
        .select()
        .single();

      if (responseError) {
        console.error('Error submitting survey:', responseError);
        throw responseError;
      }

      console.log('Survey response submitted successfully:', responseData);

      // Submit custom question responses if any
      if (formData.custom_responses && Object.keys(formData.custom_responses).length > 0) {
        const customResponsesArray = Object.entries(formData.custom_responses).map(([questionId, response]) => ({
          response_id: responseData.id,
          question_id: questionId,
          answer: response
        }));

        console.log('Submitting custom responses:', customResponsesArray);

        const { error: customError } = await supabase
          .from('custom_question_responses')
          .insert(customResponsesArray);

        if (customError) {
          console.error('Error submitting custom responses:', customError);
          throw customError;
        }

        console.log('Custom responses submitted successfully');
      }

      resetForm();
      navigate('/survey-complete');
      return true;
    } catch (error: any) {
      console.error('Error during form submission:', error);
      toast.error(error.message || 'Failed to submit survey');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    isSubmitting,
    handleInputChange,
    handleCustomQuestionResponse,
    resetForm,
    submitForm
  };
};
