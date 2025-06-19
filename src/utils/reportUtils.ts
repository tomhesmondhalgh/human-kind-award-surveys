import { supabase } from '@/integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

// Function to fetch survey responses by survey template ID
export const getSurveyResponses = async (surveyTemplateId: string) => {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_template_id', surveyTemplateId);

    if (error) {
      console.error('Error fetching survey responses:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getSurveyResponses:', error);
    return null;
  }
};

// Function to fetch custom question responses by response ID
export const getCustomQuestionResponses = async (responseId: string) => {
  try {
    const { data, error } = await supabase
      .from('custom_question_responses')
      .select('*')
      .eq('response_id', responseId);

    if (error) {
      console.error('Error fetching custom question responses:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCustomQuestionResponses:', error);
    return null;
  }
};

// Function to fetch survey template by ID
export const getSurveyTemplate = async (surveyTemplateId: string) => {
    try {
      const { data, error } = await supabase
        .from('survey_templates')
        .select('*')
        .eq('id', surveyTemplateId)
        .single();
  
      if (error) {
        console.error('Error fetching survey template:', error);
        return null;
      }
  
      return data;
    } catch (error) {
      console.error('Error in getSurveyTemplate:', error);
      return null;
    }
  };
