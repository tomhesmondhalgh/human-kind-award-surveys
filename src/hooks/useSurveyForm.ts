import { useState } from 'react';
import { SurveyFormData } from '../types/surveyForm';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';

export const initialFormData: SurveyFormData = {
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

export function useSurveyForm(surveyId: string | null, isPreview: boolean) {
  const [formData, setFormData] = useState<SurveyFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleCustomQuestionResponse = (questionId: string, value: string) => {
    console.log('Handling custom question response:', questionId, value);
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
    
    try {
      setIsSubmitting(true);
      
      console.log('Submitting survey response for survey ID:', surveyId);
      console.log('Form data:', formData);
      
      // First, insert the main survey response
      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_template_id: surveyId,
          role: formData.role,
          leadership_prioritize: formData.leadership_prioritize,
          manageable_workload: formData.manageable_workload,
          work_life_balance: formData.work_life_balance,
          health_state: formData.health_state,
          valued_member: formData.valued_member,
          support_access: formData.support_access,
          confidence_in_role: formData.confidence_in_role,
          org_pride: formData.org_pride,
          recommendation_score: formData.recommendation_score,
          leaving_contemplation: formData.leaving_contemplation,
          doing_well: formData.doing_well,
          improvements: formData.improvements
        })
        .select('id')
        .single();
      
      if (responseError) {
        console.error('Error submitting survey response:', responseError);
        toast.error('Failed to submit survey');
        return false;
      }
      
      console.log('Survey response created with ID:', responseData.id);
      
      // Handle custom questions responses if any
      const customResponses = Object.entries(formData.custom_responses);
      if (customResponses.length > 0 && responseData?.id) {
        const customResponsesPayload = customResponses.map(([questionId, answer]) => ({
          response_id: responseData.id,
          question_id: questionId,
          answer
        }));
        
        console.log('Saving custom responses:', customResponsesPayload);
        
        const { error: customError } = await supabase
          .from('custom_question_responses')
          .insert(customResponsesPayload);
        
        if (customError) {
          console.error('Error saving custom responses:', customError);
          // Continue with navigation even if custom responses fail
          // but notify the user that some data might not have been saved
          toast.error('Some responses may not have been fully saved');
        }
      }
      
      if (!isPreview) {
        navigate('/survey-complete');
        return true;
      } else {
        toast.success('Preview form submitted successfully');
        resetForm();
        return true;
      }
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      toast.error('Failed to submit survey. Please try again.');
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
    submitForm,
    resetForm
  };
}
