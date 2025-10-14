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
      console.log('Submitting survey response via validation edge function...');
      
      // Prepare custom responses
      const customResponsesPayload = formData.custom_responses && Object.keys(formData.custom_responses).length > 0
        ? Object.entries(formData.custom_responses).map(([questionId, response]) => ({
            question_id: questionId,
            answer: response
          }))
        : undefined;
      
      // Call the validation edge function instead of direct database insert
      // This provides server-side validation and sanitization
      const { data, error } = await supabase.functions.invoke('submit-survey-response', {
        body: {
          survey_template_id: surveyId,
          role: formData.role || null,
          leadership_prioritize: formData.leadership_prioritize || null,
          manageable_workload: formData.manageable_workload || null,
          work_life_balance: formData.work_life_balance || null,
          health_state: formData.health_state || null,
          valued_member: formData.valued_member || null,
          support_access: formData.support_access || null,
          confidence_in_role: formData.confidence_in_role || null,
          org_pride: formData.org_pride || null,
          recommendation_score: formData.recommendation_score || null,
          leaving_contemplation: formData.leaving_contemplation || null,
          doing_well: formData.doing_well || null,
          improvements: formData.improvements || null,
          custom_responses: customResponsesPayload
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to submit survey response');
      }
      
      if (!data?.success) {
        console.error('Survey submission failed:', data);
        throw new Error(data?.error || 'Failed to submit survey response');
      }
      
      console.log('Survey response submitted successfully:', data.response_id);

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
