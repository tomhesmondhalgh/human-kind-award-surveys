import { supabase } from '@/integrations/supabase/client';
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
    
    // Only organisation members can read survey_templates; respondents load
    // surveys through the get_public_survey function instead.
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

// Closure notification emails are sent by a scheduled job (send-closure-notification
// in cron mode), not from the browser.
