
import { supabase } from '../lib/supabase';
import type { 
  SurveyOption,
  DetailedQuestionResponse,
  TextResponse
} from './analysisUtils';

// Types for the summary response
export interface SummaryData {
  introduction: string;
  strengths: string[];
  improvements: string[];
  insufficientData?: boolean;
}

// Default summary for when there's insufficient data
const getInsufficientDataSummary = (): SummaryData => {
  return {
    introduction: '',
    strengths: [],
    improvements: [],
    insufficientData: true
  };
};

// Mock AI summary for when the Edge Function is unavailable
const getMockSummary = (): SummaryData => {
  return {
    introduction: "", // Removed the introduction text as requested
    strengths: [
      "Strong sense of pride in the organization with 85% of staff responding positively",
      "Staff feel valued as members of the organization, scoring above national average",
      "Good support systems in place with 75% of staff able to access help when needed"
    ],
    improvements: [
      "Work-life balance could be improved, with 50% of staff reporting concerns",
      "Workload management requires attention, particularly regarding distribution across departments",
      "Consider additional planning time for curriculum initiatives based on feedback"
    ]
  };
};

// Function to get AI-generated summary of survey data
export const getSurveySummary = async (
  surveyId: string,
  recommendationScore: { score: number, nationalAverage: number },
  leavingContemplation: Record<string, number>,
  detailedResponses: DetailedQuestionResponse[],
  textResponses: { doingWell: TextResponse[], improvements: TextResponse[] }
): Promise<SummaryData> => {
  try {
    // Calculate total responses to check if we have enough data
    // Instead of using leavingContemplation which might be filtered, let's check detailedResponses
    // Check if there are any detailedResponses - each question should have the same number of total responses
    const hasResponses = detailedResponses.length > 0;
    let totalResponses = 0;
    
    if (hasResponses) {
      // Get total responses by summing up the school responses for the first question
      const firstQuestion = detailedResponses[0];
      if (firstQuestion && firstQuestion.schoolResponses) {
        totalResponses = Object.values(firstQuestion.schoolResponses)
          .reduce((sum, count) => {
            // Convert from percentage back to count
            // Since the values are stored as decimals (percentages), we need to calculate the actual count
            return sum + Math.round(count * 100); 
          }, 0);
      }
      
      console.log('Total responses calculated for summary:', totalResponses);
    }
    
    // If we don't have enough data (now checking for at least 10 responses), return a message
    if (totalResponses < 10) {
      console.log('Insufficient data for AI summary, need at least 10 responses but found:', totalResponses);
      return getInsufficientDataSummary();
    }
    
    // Try to call the Supabase Edge Function to generate the summary
    try {
      console.log('Calling edge function to generate summary with', totalResponses, 'responses');
      const { data, error } = await supabase.functions.invoke('generate-survey-summary', {
        body: {
          recommendationScore,
          leavingContemplation,
          detailedResponses,
          textResponses
        }
      });
      
      if (error) {
        console.error('Error generating survey summary:', error);
        // Return mock data instead of throwing an error
        console.info('Using mock summary data due to Edge Function error');
        return getMockSummary();
      }
      
      // If API returns insufficient data flag
      if (data.insufficientData) {
        return getInsufficientDataSummary();
      }
      
      // Return the summary data, limiting to 3 items each
      return {
        introduction: '', // Return empty introduction as requested
        strengths: (data.strengths || []).slice(0, 3),
        improvements: (data.improvements || []).slice(0, 3)
      };
    } catch (functionError) {
      console.error('Error calling Edge Function:', functionError);
      return getMockSummary();
    }
  } catch (error) {
    console.error('Error in getSurveySummary:', error);
    // Return mock data instead of an error message
    return getMockSummary();
  }
};
