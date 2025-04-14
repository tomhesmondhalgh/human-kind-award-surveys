
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
      console.log('Custom responses being submitted:', formData.custom_responses);
      
      // Debug info without accessing protected properties
      console.log('Using Supabase client from integrations/supabase/client');
      console.log('Submission URL:', `${window.location.origin}/survey?id=${surveyId}`);
      
      // Construct response payload
      const responsePayload = {
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
      };
      
      // Add additional debug information
      console.log('Client URL:', supabase.supabaseUrl);
      console.log('Using anonymous client:', !supabase.auth.getSession());
      console.log('Detailed response payload:', JSON.stringify(responsePayload));
      
      // Insert directly without any transformations
      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert(responsePayload)
        .select('id')
        .single();
      
      if (responseError) {
        console.error('Error submitting survey response:', responseError);
        console.error('Error code:', responseError.code);
        console.error('Error message:', responseError.message);
        console.error('Error details:', responseError.details);
        
        // Check for specific RLS errors
        if (responseError.message.includes('violates row-level security policy')) {
          toast.error('Permission denied: The submission is blocked by security policies. Please contact support.');
          console.error('RLS policy violation - Need to update Supabase policies to allow public submissions.');
          console.error('This generally means the RLS policy is not properly allowing anonymous users to insert data.');
          console.error('Please check that the RLS policy named "Allow anonymous survey submissions" exists and is properly configured.');
          return false;
        } else {
          toast.error(`Submission error: ${responseError.message}`);
        }
        return false;
      }
      
      console.log('Survey response created with ID:', responseData?.id);
      
      // Handle custom questions responses if any
      const customResponses = Object.entries(formData.custom_responses);
      if (customResponses.length > 0 && responseData?.id) {
        try {
          const customResponsesPayload = customResponses.map(([questionId, answer]) => ({
            response_id: responseData.id,
            question_id: questionId,
            answer
          }));
          
          console.log('Saving custom responses:', customResponsesPayload);
          
          if (customResponsesPayload.length > 0) {
            const { error: customError } = await supabase
              .from('custom_question_responses')
              .insert(customResponsesPayload);
            
            if (customError) {
              console.error('Error saving custom responses:', customError);
              console.error('Custom error details:', customError.details);
              toast.error('Some responses may not have been fully saved');
            } else {
              console.log('Custom responses saved successfully');
            }
          }
        } catch (customErr) {
          console.error('Exception handling custom responses:', customErr);
          // Continue with navigation even if custom responses fail
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
      toast.error(`Failed to submit survey: ${error.message || 'Unknown error'}`);
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
