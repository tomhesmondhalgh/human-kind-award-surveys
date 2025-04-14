
import { supabase } from "../../integrations/supabase/client";

/**
 * Counts the number of responses for a given survey
 * 
 * @param surveyId - The ID of the survey to count responses for
 * @returns The count of responses or 0 if an error occurs
 */
export const countSurveyResponses = async (surveyId: string): Promise<number> => {
  try {
    console.log(`Counting responses for survey ${surveyId}`);
    
    // Use a count query with minimal selection to avoid type instantiation issues
    const { count, error } = await supabase
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_template_id', surveyId);
    
    if (error) {
      console.error(`Error counting responses for survey ${surveyId}:`, error);
      return 0;
    }
    
    console.log(`Responses for survey ${surveyId}:`, count);
    return count || 0;
  } catch (error) {
    console.error(`Unexpected error counting responses for survey ${surveyId}:`, error);
    return 0;
  }
};

/**
 * Counts the number of email responses for a given survey
 * 
 * @param surveyId - The ID of the survey to count email responses for
 * @returns The count of email responses or 0 if an error occurs
 */
export const countEmailResponses = async (surveyId: string): Promise<number> => {
  try {
    console.log(`Counting email responses for survey ${surveyId}`);
    
    // Since we don't have a response_type column, just return the total count for now
    // This should be updated when email response tracking is implemented
    const { count, error } = await supabase
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_template_id', surveyId);
    
    if (error) {
      console.error(`Error counting email responses for survey ${surveyId}:`, error);
      return 0;
    }
    
    console.log(`Email responses for survey ${surveyId}:`, count);
    return count || 0;
  } catch (error) {
    console.error(`Unexpected error counting email responses for survey ${surveyId}:`, error);
    return 0;
  }
};
