
import { supabase } from "@/integrations/supabase/client";
import { calculateBenchmarkScore } from "./benchmark";
import { countEmailResponses } from "./responses";

export const getDashboardStats = async (organizationId?: string) => {
  try {
    console.log('Fetching dashboard stats for organization:', organizationId);
    
    // Verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('No valid session found when fetching dashboard stats:', sessionError);
      return null;
    }
    
    if (!organizationId) {
      console.warn('No organization ID provided for dashboard stats');
      return {
        totalSurveys: 0,
        totalRespondents: 0,
        responseRate: "0%",
        benchmarkScore: "0"
      };
    }
    
    // Verify user has access to this organization
    const { data: membershipCheck, error: membershipError } = await supabase
      .rpc('user_is_organization_member', { 
        user_uuid: session.user.id, 
        org_id: organizationId 
      });
    
    if (membershipError || !membershipCheck) {
      console.error('User does not have access to organization:', organizationId);
      return null;
    }
    
    // Count surveys for this organization
    const { count: surveyCount, error: surveyError } = await supabase
      .from('survey_templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('status', 'Archived');
    
    if (surveyError) {
      console.error('Error counting surveys:', surveyError);
      return null;
    }
    
    console.log('Total surveys for this organization:', surveyCount);
    
    // Get all survey IDs for this organization
    const { data: orgSurveys, error: orgSurveysError } = await supabase
      .from('survey_templates')
      .select('id')
      .eq('organization_id', organizationId)
      .neq('status', 'Archived');
      
    if (orgSurveysError) {
      console.error('Error fetching organization surveys:', orgSurveysError);
      return null;
    }
    
    if (!orgSurveys || orgSurveys.length === 0) {
      return {
        totalSurveys: 0,
        totalRespondents: 0,
        responseRate: "0%",
        benchmarkScore: "0"
      };
    }
    
    const surveyIds = orgSurveys.map(survey => survey.id);
    
    // Count total responses across all surveys
    let totalResponses = 0;
    for (const surveyId of surveyIds) {
      const responses = await countEmailResponses(surveyId);
      totalResponses += responses;
    }
    
    console.log('Total responses for this organization\'s surveys:', totalResponses);
    
    // Calculate benchmark score
    const benchmarkScore = await calculateBenchmarkScore(surveyIds);
    
    // Get sent surveys to calculate response rate
    const { data: sentSurveys, error: sentSurveysError } = await supabase
      .from('survey_templates')
      .select('emails')
      .eq('organization_id', organizationId)
      .in('status', ['Sent', 'Completed'])
      .not('emails', 'is', null)
      .not('emails', 'eq', '');
    
    if (sentSurveysError) {
      console.error('Error fetching sent surveys for response rate:', sentSurveysError);
      return {
        totalSurveys: surveyCount || 0,
        totalRespondents: totalResponses,
        responseRate: "0%",
        benchmarkScore: benchmarkScore
      };
    }
    
    // Calculate total recipients from sent surveys
    let totalRecipients = 0;
    if (sentSurveys && sentSurveys.length > 0) {
      console.log('Calculating total recipients from sent surveys');
      
      sentSurveys.forEach(survey => {
        if (survey.emails) {
          const emailsArray = survey.emails
            .split(',')
            .map(email => email.trim())
            .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
          
          totalRecipients += emailsArray.length;
        }
      });
    }
    
    console.log('Total email recipients:', totalRecipients);
    
    // Calculate response rate
    let responseRate = 0;
    if (totalRecipients > 0) {
      responseRate = Math.round((totalResponses / totalRecipients) * 100);
    }
    
    console.log('Calculated response rate:', responseRate);
    
    return {
      totalSurveys: surveyCount || 0,
      totalRespondents: totalResponses,
      responseRate: `${responseRate}%`,
      benchmarkScore: benchmarkScore
    };
  } catch (error) {
    console.error('Unexpected error in getDashboardStats:', error);
    return null;
  }
};
