
import { supabase } from "@/integrations/supabase/client";
import { calculateBenchmarkScore } from "./benchmark";
import { countEmailResponses } from "./responses";

export const getDashboardStats = async () => {
  try {
    console.log('Fetching dashboard stats');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found when fetching dashboard stats');
      return null;
    }
    
    const { count: surveyCount, error: surveyError } = await supabase
      .from('survey_templates')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', user.id);
    
    if (surveyError) {
      console.error('Error counting surveys:', surveyError);
      return null;
    }
    
    console.log('Total surveys for this user:', surveyCount);
    
    const { data: userSurveys, error: userSurveysError } = await supabase
      .from('survey_templates')
      .select('id')
      .eq('creator_id', user.id);
      
    if (userSurveysError) {
      console.error('Error fetching user surveys:', userSurveysError);
      return null;
    }
    
    if (!userSurveys || userSurveys.length === 0) {
      return {
        totalSurveys: 0,
        totalRespondents: 0,
        responseRate: "0%",
        benchmarkScore: "0"
      };
    }
    
    const surveyIds = userSurveys.map(survey => survey.id);
    
    // Use countEmailResponses for the email respondents count
    let totalEmailRespondents = 0;
    for (const surveyId of surveyIds) {
      const emailResponses = await countEmailResponses(surveyId);
      totalEmailRespondents += emailResponses;
    }
    
    console.log('Total email responses for this user\'s surveys:', totalEmailRespondents);
    
    const benchmarkScore = await calculateBenchmarkScore(surveyIds);
    
    const { data: surveyTemplates, error: templatesFetchError } = await supabase
      .from('survey_templates')
      .select('emails')
      .eq('creator_id', user.id)
      .not('emails', 'is', null)
      .not('emails', 'eq', '')
      .filter('date', 'lt', new Date().toISOString());
    
    if (templatesFetchError) {
      console.error('Error fetching templates for response rate:', templatesFetchError);
      return {
        totalSurveys: surveyCount || 0,
        totalRespondents: totalEmailRespondents,
        responseRate: "0%",
        benchmarkScore: benchmarkScore
      };
    }
    
    let totalRecipients = 0;
    if (surveyTemplates && surveyTemplates.length > 0) {
      console.log('Calculating total recipients from sent surveys');
      
      surveyTemplates.forEach(template => {
        if (template.emails) {
          const emailsArray = template.emails
            .split(',')
            .map(email => email.trim())
            .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
          
          totalRecipients += emailsArray.length;
        }
      });
    }
    
    console.log('Total email recipients:', totalRecipients);
    
    let responseRate = 0;
    if (totalRecipients > 0) {
      responseRate = Math.round((totalEmailRespondents / totalRecipients) * 100);
    }
    
    console.log('Calculated email response rate:', responseRate);
    
    return {
      totalSurveys: surveyCount || 0,
      totalRespondents: totalEmailRespondents,
      responseRate: `${responseRate}%`,
      benchmarkScore: benchmarkScore
    };
  } catch (error) {
    console.error('Unexpected error in getDashboardStats:', error);
    return null;
  }
};
