
import { supabase } from "../../lib/supabase";
import { ActionPlanDescriptor } from "../../types/actionPlan";

/**
 * Get action plan descriptors for a section
 */
export const getActionPlanDescriptors = async (
  userId: string,
  section: string
): Promise<{ success: boolean, data?: ActionPlanDescriptor[], error?: string }> => {
  try {
    console.log('Fetching descriptors for section:', section);

    const { data, error } = await supabase
      .from('action_plan_descriptors')
      .select('*')
      .eq('user_id', userId)
      .eq('section', section)
      .order('index_number', { ascending: true });

    if (error) {
      console.error('Error fetching descriptors:', error);
      return { success: false, error: error.message };
    }

    const descriptors = data as unknown as ActionPlanDescriptor[];

    return { success: true, data: descriptors };
  } catch (error) {
    console.error('Error fetching descriptors:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
