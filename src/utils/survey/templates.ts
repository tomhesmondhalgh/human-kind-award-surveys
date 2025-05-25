import { supabase } from "../../integrations/supabase/client";
import { SurveyTemplate, SurveyWithResponses } from "../types/survey";
import { countSurveyResponses } from "./responses";
import { isSurveyClosed } from "./status";

export const getSurveyById = async (id: string): Promise<SurveyTemplate | null> => {
  try {
    console.log(`Fetching survey template with ID: ${id}`);
    
    // Check if Supabase client is properly initialized
    if (!supabase) {
      console.error('Supabase client is not initialized');
      throw new Error('Database connection error');
    }
    
    // Verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('No valid session for survey fetch:', sessionError);
      throw new Error('Authentication required');
    }
    
    // Fetch the survey
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching survey template:', error);
      throw error;
    }
    
    if (!data) {
      console.error('No survey template found with ID:', id);
      return null;
    }
    
    // Check if user has access to this survey through organization membership
    if (data.organization_id) {
      const { data: hasAccess, error: accessError } = await supabase
        .rpc('user_is_organization_member', { 
          user_uuid: session.user.id, 
          org_id: data.organization_id 
        });
      
      if (accessError || !hasAccess) {
        console.error('User does not have access to this survey:', id);
        return null;
      }
    }
    
    console.log('Survey template found:', data);
    return data as SurveyTemplate;
  } catch (error) {
    console.error('Unexpected error in getSurveyById:', error);
    return null;
  }
};

export const getAllSurveyTemplates = async (organizationId?: string): Promise<SurveyTemplate[]> => {
  try {
    // Verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('No valid session for survey templates fetch:', sessionError);
      return [];
    }
    
    let query = supabase
      .from('survey_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (organizationId) {
      // Verify user has access to this organization
      const { data: hasAccess, error: accessError } = await supabase
        .rpc('user_is_organization_member', { 
          user_uuid: session.user.id, 
          org_id: organizationId 
        });
      
      if (accessError || !hasAccess) {
        console.error('User does not have access to organization:', organizationId);
        return [];
      }
      
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching survey templates:', error);
      return [];
    }
    
    return data as SurveyTemplate[];
  } catch (error) {
    console.error('Unexpected error in getAllSurveyTemplates:', error);
    return [];
  }
};

export const getRecentSurveys = async (limit: number = 3, organizationId?: string): Promise<SurveyWithResponses[]> => {
  try {
    console.log(`Fetching recent surveys, limit: ${limit}, organizationId: ${organizationId}`);
    
    // Verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('No valid session for recent surveys fetch:', sessionError);
      return [];
    }
    
    if (!organizationId) {
      console.warn('No organization ID provided for recent surveys');
      return [];
    }
    
    // Verify user has access to this organization
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('user_is_organization_member', { 
        user_uuid: session.user.id, 
        org_id: organizationId 
      });
    
    if (accessError || !hasAccess) {
      console.error('User does not have access to organization:', organizationId);
      return [];
    }
    
    const { data: templates, error: templatesError } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .neq('status', 'Archived')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (templatesError) {
      console.error('Error fetching recent surveys:', templatesError);
      return [];
    }
    
    console.log('Templates fetched:', templates);
    
    if (!templates || templates.length === 0) {
      console.log('No templates found');
      return [];
    }
    
    const surveysWithResponses = await Promise.all(
      templates.map(async (template) => {
        const responseCount = await countSurveyResponses(template.id);
        return { ...template, responses: responseCount };
      })
    );
    
    console.log('Surveys with responses:', surveysWithResponses);
    return surveysWithResponses as SurveyWithResponses[];
  } catch (error) {
    console.error('Unexpected error in getRecentSurveys:', error);
    return [];
  }
};

export const checkForClosedSurveys = async () => {
  try {
    console.log('Checking for surveys that have recently closed');
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const todayStart = `${todayStr}T00:00:00.000Z`;
    const todayEnd = `${todayStr}T23:59:59.999Z`;
    
    const { data: closedSurveys, error } = await supabase
      .from('survey_templates')
      .select(`
        id,
        name,
        close_date,
        organization_id,
        profiles(
          email,
          first_name,
          last_name
        )
      `)
      .gte('close_date', todayStart)
      .lte('close_date', todayEnd)
      .not('organization_id', 'is', null)
      .not('close_date', 'is', null);
    
    if (error) {
      console.error('Error fetching closed surveys:', error);
      return;
    }
    
    console.log(`Found ${closedSurveys?.length || 0} surveys that closed today:`, closedSurveys);
    
    if (closedSurveys && closedSurveys.length > 0) {
      for (const survey of closedSurveys) {
        if (!survey.organization_id || !survey.profiles) {
          console.log(`Survey ${survey.id} has no organization or profiles, skipping notification`);
          continue;
        }
        
        const creatorProfile = Array.isArray(survey.profiles) 
          ? survey.profiles[0] 
          : survey.profiles;
        
        if (!creatorProfile || !creatorProfile.email) {
          console.log(`Survey ${survey.id} has no valid creator profile, skipping notification`);
          continue;
        }
        
        const creator = {
          id: survey.organization_id,
          email: creatorProfile.email,
          firstName: creatorProfile.first_name,
          lastName: creatorProfile.last_name
        };
        
        const baseUrl = window.location.origin;
        const analysisUrl = `${baseUrl}/analysis?id=${survey.id}`;
        
        console.log(`Sending closure notification for survey ${survey.id} to ${creator.email}`);
        
        const { data, error: notificationError } = await supabase.functions.invoke('send-closure-notification', {
          body: {
            surveyId: survey.id,
            surveyName: survey.name,
            creator: creator,
            analysisUrl: analysisUrl
          }
        });
        
        if (notificationError) {
          console.error(`Error sending closure notification for survey ${survey.id}:`, notificationError);
        } else {
          console.log(`Closure notification sent for survey ${survey.id}:`, data);
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error in checkForClosedSurveys:', error);
  }
};
