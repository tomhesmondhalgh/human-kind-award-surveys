
import {
  ILLUSTRATIVE_RECOMMENDATION_AVERAGE,
  WELLBEING_FIELDS,
  fetchNationalBenchmarks,
  nationalAgreementSplit,
  nationalRecommendationAverage,
} from '@/utils/benchmarks';
import { supabase } from '@/integrations/supabase/client';
import { frequencyOptions } from '@/components/survey-form/constants';

// Type definitions
export interface SurveyOption {
  id: string;
  name: string;
  date: string;
}

export interface DetailedQuestionResponse {
  question: string;
  schoolResponses: Record<string, number>;
  nationalResponses: Record<string, number>;
}

export interface TextResponse {
  response: string;
  created_at: string;
}

export interface CustomQuestionResponse {
  question: string;
  responses: string[];
}

// Add explicit type for database survey response
interface DatabaseSurvey {
  id: string;
  name: string;
  date: string;
}

// Function to get survey options
export const getSurveyOptions = async (userId?: string): Promise<SurveyOption[]> => {
  try {
    // If no userId provided, we can't filter by user
    if (!userId) {
      console.log("No user ID provided to getSurveyOptions, returning empty array");
      return [];
    }
    
    console.log(`Fetching surveys for user ID: ${userId}`);
    
    // Get user's organizations first
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', userId);
    
    if (membershipError) {
      console.error('Error fetching user organizations:', membershipError);
      throw membershipError;
    }
    
    if (!memberships || memberships.length === 0) {
      console.log('User has no organization memberships');
      return [];
    }
    
    const orgIds = memberships.map(m => m.organization_id);
    
    // Get surveys from user's organizations with explicit typing
    const { data, error } = await supabase
      .from('survey_templates')
      .select('id, name, date')
      .in('organization_id', orgIds)
      .order('date', { ascending: false })
      .returns<DatabaseSurvey[]>();
    
    if (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
    
    console.log('Survey data from database:', data);
    
    // Return with explicit type mapping
    const surveyOptions: SurveyOption[] = data?.map((survey: DatabaseSurvey) => ({
      id: survey.id,
      name: survey.name,
      date: new Date(survey.date).toLocaleDateString(),
    })) || [];
    
    return surveyOptions;
    
  } catch (error) {
    console.error('Error in getSurveyOptions:', error);
    // Return empty array instead of mock data to accurately reflect no surveys
    return [];
  }
};

// Function to get recommendation score
export const getRecommendationScore = async (
  surveyId: string, 
  startDate?: string, 
  endDate?: string
): Promise<{ score: number, nationalAverage: number }> => {
  try {
    // Try to get real data from Supabase
    const query = supabase
      .from('survey_responses')
      .select('recommendation_score')
      .eq('survey_template_id', surveyId);
    
    // Apply date filters if provided
    if (startDate) {
      query.gte('created_at', startDate);
    }
    if (endDate) {
      query.lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching recommendation score:', error);
      throw error;
    }
    
    // If no data, return zeros instead of mock data
    if (!data || data.length === 0) {
      return {
        score: 0,
        nationalAverage: nationalRecommendationAverage(await fetchNationalBenchmarks())
      };
    }
    
    // Calculate average score from responses
    const scores = data
      .map(response => Number(response.recommendation_score))
      .filter(score => !isNaN(score));
    
    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
      : 0;
    
    return {
      score: averageScore,
      nationalAverage: nationalRecommendationAverage(await fetchNationalBenchmarks())
    };
  } catch (error) {
    console.error('Error in getRecommendationScore:', error);
    // Return zeros instead of mock data
    return { score: 0, nationalAverage: ILLUSTRATIVE_RECOMMENDATION_AVERAGE };
  }
};

// The five answers the respondent form offers for "In the last 6 months I have
// contemplated leaving my role", in chart order.
export const LEAVING_CONTEMPLATION_OPTIONS = [...frequencyOptions];

export interface LeavingContemplationData {
  // Number of responses for each of LEAVING_CONTEMPLATION_OPTIONS.
  counts: Record<string, number>;
  // Share of responses for each option as a decimal (0-1), for stacked charts.
  proportions: Record<string, number>;
  total: number;
}

// Legacy / variant spellings seen or plausible in stored data.
const LEAVING_ALIASES: Record<string, string> = {
  'always': 'All the Time',
  'all of the time': 'All the Time',
};

const normaliseLeavingAnswer = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  const match = LEAVING_CONTEMPLATION_OPTIONS.find(option => option.toLowerCase() === key);
  return match ?? LEAVING_ALIASES[key] ?? null;
};

export const emptyLeavingContemplation = (): LeavingContemplationData => {
  const zeros = Object.fromEntries(LEAVING_CONTEMPLATION_OPTIONS.map(option => [option, 0]));
  return { counts: { ...zeros }, proportions: { ...zeros }, total: 0 };
};

// Counts stored answers into the five form options. Unrecognised values are
// logged and left out of both the counts and the total.
export const summariseLeavingContemplation = (values: unknown[]): LeavingContemplationData => {
  const result = emptyLeavingContemplation();
  values.forEach(value => {
    const option = normaliseLeavingAnswer(value);
    if (option) {
      result.counts[option]++;
      result.total++;
    } else if (value !== null && value !== undefined && value !== '') {
      console.warn('Unrecognised leaving_contemplation value:', value);
    }
  });
  if (result.total > 0) {
    LEAVING_CONTEMPLATION_OPTIONS.forEach(option => {
      result.proportions[option] = Math.round((result.counts[option] / result.total) * 100) / 100;
    });
  }
  return result;
};

// Function to get leaving contemplation data
export const getLeavingContemplation = async (
  surveyId: string, 
  startDate?: string, 
  endDate?: string
): Promise<LeavingContemplationData> => {
  try {
    let query = supabase
      .from('survey_responses')
      .select('leaving_contemplation')
      .eq('survey_template_id', surveyId)
      .not('leaving_contemplation', 'is', null);
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching leaving contemplation data:', error);
      throw error;
    }
    
    return summariseLeavingContemplation((data ?? []).map(row => row.leaving_contemplation));
  } catch (error) {
    console.error('Error in getLeavingContemplation:', error);
    return emptyLeavingContemplation();
  }
};

// Number of responses to a survey in the (optional) date range. This is the
// real count used for the anonymity floor and the AI-summary minimum.
export const getResponseCount = async (
  surveyId: string,
  startDate?: string,
  endDate?: string
): Promise<number> => {
  let query = supabase
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_template_id', surveyId);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { count, error } = await query;
  if (error) {
    console.error('Error counting survey responses:', error);
    throw error;
  }
  return count ?? 0;
};

// Function to get detailed wellbeing responses
export const getDetailedWellbeingResponses = async (
  surveyId: string, 
  startDate?: string, 
  endDate?: string
): Promise<DetailedQuestionResponse[]> => {
  try {
    // Define the wellbeing questions
    const wellbeingQuestions = [
      "I feel valued as a member of this organisation",
      "Leadership prioritises staff wellbeing",
      "My workload is manageable",
      "I have a good work-life balance",
      "I am in good physical and mental health",
      "I can access support when I need it",
      "I feel confident in my role",
      "I am proud to work for this organisation"
    ];
    
    // Query for getting responses from Supabase
    const query = supabase
      .from('survey_responses')
      .select('valued_member, leadership_prioritize, manageable_workload, work_life_balance, health_state, support_access, confidence_in_role, org_pride')
      .eq('survey_template_id', surveyId);
    
    // Apply date filters
    if (startDate) {
      query.gte('created_at', startDate);
    }
    if (endDate) {
      query.lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching wellbeing responses:', error);
      throw error;
    }
    
    const benchmarks = await fetchNationalBenchmarks();

    // If no data, return default structure with national averages
    if (!data || data.length === 0) {
      return wellbeingQuestions.map((question, index) => ({
        question,
        schoolResponses: {
          "Strongly Agree": 0,
          "Agree": 0,
          "Disagree": 0,
          "Strongly Disagree": 0
        },
        nationalResponses: nationalAgreementSplit(benchmarks, WELLBEING_FIELDS[index])
      }));
    }
    
    // Calculate responses for each question
    const fieldMappings = [
      'valued_member',
      'leadership_prioritize',
      'manageable_workload',
      'work_life_balance', 
      'health_state',
      'support_access',
      'confidence_in_role',
      'org_pride'
    ];
    
    return wellbeingQuestions.map((question, index) => {
      const field = fieldMappings[index];
      
      // Count responses for this question
      const responses: Record<string, number> = {
        "Strongly Agree": 0,
        "Agree": 0,
        "Disagree": 0,
        "Strongly Disagree": 0
      };
      
      data.forEach(row => {
        const answer = row[field as keyof typeof row];
        if (answer && typeof answer === 'string' && responses[answer] !== undefined) {
          responses[answer]++;
        }
      });
      
      // Convert to percentages for display in normalized charts
      const total = Object.values(responses).reduce((sum, count) => sum + count, 0);
      const percentages: Record<string, number> = { ...responses };
      
      if (total > 0) {
        Object.keys(percentages).forEach(key => {
          percentages[key] = Math.round((responses[key] / total) * 100) / 100; // Return as decimal for stacked charts
        });
      }
      
      return {
        question,
        schoolResponses: percentages,
        nationalResponses: nationalAgreementSplit(benchmarks, field)
      };
    });
    
  } catch (error) {
    console.error('Error in getDetailedWellbeingResponses:', error);
    return [];
  }
};

// Function to get text responses
export const getTextResponses = async (
  surveyId: string,
  startDate?: string,
  endDate?: string
): Promise<{ doingWell: TextResponse[], improvements: TextResponse[] }> => {
  try {
    // Query for getting text responses from Supabase
    const query = supabase
      .from('survey_responses')
      .select('doing_well, improvements, created_at')
      .eq('survey_template_id', surveyId);
    
    // Apply date filters
    if (startDate) {
      query.gte('created_at', startDate);
    }
    if (endDate) {
      query.lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching text responses:', error);
      throw error;
    }
    
    // If no data, return empty arrays
    if (!data || data.length === 0) {
      return {
        doingWell: [],
        improvements: []
      };
    }
    
    // Format the responses
    const doingWell: TextResponse[] = [];
    const improvements: TextResponse[] = [];
    
    data.forEach(row => {
      const createdAt = new Date(row.created_at).toLocaleDateString();
      
      if (row.doing_well) {
        doingWell.push({
          response: row.doing_well,
          created_at: createdAt
        });
      }
      
      if (row.improvements) {
        improvements.push({
          response: row.improvements,
          created_at: createdAt
        });
      }
    });
    
    return {
      doingWell,
      improvements
    };
    
  } catch (error) {
    console.error('Error in getTextResponses:', error);
    return {
      doingWell: [],
      improvements: []
    };
  }
};

// Function to get custom question responses
export const getCustomQuestionResponses = async (
  surveyId: string,
  startDate?: string,
  endDate?: string
): Promise<CustomQuestionResponse[]> => {
  try {
    console.log('Fetching custom question responses for survey:', surveyId);
    
    // First, get the question IDs linked to this survey
    const { data: linkData, error: linkError } = await supabase
      .from('survey_questions')
      .select('question_id')
      .eq('survey_id', surveyId);
    
    if (linkError) {
      console.error('Error fetching question links:', linkError);
      throw new Error(`Failed to fetch question links: ${linkError.message}`);
    }
    
    if (!linkData || linkData.length === 0) {
      console.log('No custom questions found for survey ID:', surveyId);
      return [];
    }
    
    // Extract question IDs
    const questionIds = linkData.map(link => link.question_id);
    
    // Fetch the question texts
    const { data: questionsData, error: questionsError } = await supabase
      .from('custom_questions')
      .select('id, text')
      .in('id', questionIds);
    
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }
    
    if (!questionsData || questionsData.length === 0) {
      return [];
    }
    
    // Build a map of question IDs to their text
    const questionsMap = questionsData.reduce((map, q) => {
      map[q.id] = q.text;
      return map;
    }, {} as Record<string, string>);
    
    // Get all responses for this survey
    const query = supabase
      .from('survey_responses')
      .select('id, created_at')
      .eq('survey_template_id', surveyId);
    
    // Apply date filters if provided
    if (startDate) {
      query.gte('created_at', startDate);
    }
    if (endDate) {
      query.lte('created_at', endDate);
    }
    
    const { data: responseData, error: responseError } = await query;
    
    if (responseError) {
      console.error('Error fetching survey responses:', responseError);
      throw new Error(`Failed to fetch survey responses: ${responseError.message}`);
    }
    
    if (!responseData || responseData.length === 0) {
      return [];
    }
    
    // Get response IDs
    const responseIds = responseData.map(r => r.id);
    
    // Get custom question responses
    const { data: customResponsesData, error: customResponsesError } = await supabase
      .from('custom_question_responses')
      .select('question_id, answer')
      .in('response_id', responseIds);
    
    if (customResponsesError) {
      console.error('Error fetching custom question responses:', customResponsesError);
      throw new Error(`Failed to fetch custom question responses: ${customResponsesError.message}`);
    }
    
    if (!customResponsesData || customResponsesData.length === 0) {
      return [];
    }
    
    // Group responses by question
    const groupedResponses: Record<string, string[]> = {};
    
    customResponsesData.forEach(response => {
      if (!groupedResponses[response.question_id]) {
        groupedResponses[response.question_id] = [];
      }
      if (response.answer) {
        groupedResponses[response.question_id].push(response.answer);
      }
    });
    
    // Format the result
    const result: CustomQuestionResponse[] = [];
    
    Object.keys(groupedResponses).forEach(questionId => {
      const questionText = questionsMap[questionId];
      if (questionText) {
        result.push({
          question: questionText,
          responses: groupedResponses[questionId]
        });
      }
    });
    
    console.log('Fetched custom question responses:', result);
    return result;
    
  } catch (error) {
    console.error('Error getting custom question responses:', error);
    return [];
  }
};
