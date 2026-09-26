
import { supabase } from "@/integrations/supabase/client";
import { PlanType } from "../../lib/supabase/subscription";

/**
 * Calculates the benchmark score based on recommendation scores
 * 
 * @param surveyIds - Array of survey IDs to calculate the benchmark for
 * @param hasNationalAccess - Whether the user has access to national benchmarks
 * @returns The formatted benchmark score as a string
 */
export const calculateBenchmarkScore = async (
  surveyIds: string[],
  hasNationalAccess: boolean = false
): Promise<string> => {
  try {
    console.log('Calculating benchmark for survey IDs:', surveyIds);
    console.log('User has national access:', hasNationalAccess);
    
    const { data: recommendationData, error: recommendationError } = await supabase
      .from('survey_responses')
      .select('recommendation_score')
      .in('survey_template_id', surveyIds)
      .not('recommendation_score', 'is', null);
    
    let benchmarkScore = "0";
    
    if (recommendationError) {
      console.error('Error fetching recommendation scores:', recommendationError);
      return benchmarkScore;
    }
    
    if (recommendationData && recommendationData.length > 0) {
      const validScores = recommendationData
        .map(response => Number(response.recommendation_score))
        .filter(score => !isNaN(score) && score > 0);
      
      if (validScores.length > 0) {
        const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
        benchmarkScore = averageScore.toFixed(1);
        console.log('Calculated benchmark score from recommendation data:', benchmarkScore);
      }
    }
    
    // If user doesn't have access to national benchmarks, return only the local score
    if (!hasNationalAccess) {
      console.log('User does not have access to national benchmarks, returning only local score');
      return benchmarkScore;
    }
    
    console.log('Returning benchmark with national access:', benchmarkScore);
    return benchmarkScore;
  } catch (error) {
    console.error('Error calculating benchmark score:', error);
    return "0";
  }
};
