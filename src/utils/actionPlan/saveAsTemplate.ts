
import { supabase } from "../../lib/supabase";

/**
 * Save descriptors as a template
 */
export const saveAsTemplate = async (
  userId: string,
  section: string,
  templateName: string
): Promise<{ success: boolean, error?: string }> => {
  try {
    console.log('Saving descriptors as template:', templateName);

    // Create a template entry
    const { data: templateData, error: templateError } = await supabase
      .from('action_plan_templates')
      .insert({
        user_id: userId,
        name: templateName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (templateError) {
      console.error('Error creating template:', templateError);
      return { success: false, error: templateError.message };
    }

    if (!templateData) {
      return { success: false, error: 'Failed to create template' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
