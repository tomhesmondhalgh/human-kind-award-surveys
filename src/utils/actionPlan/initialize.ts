
import { supabase } from "../../lib/supabase";

/**
 * Initialize the action plan for a user
 */
export const initializeActionPlan = async (userId: string): Promise<{ success: boolean, error?: string }> => {
  try {
    console.log('Initializing action plan for user:', userId);

    const { data, error } = await supabase
      .from('action_plan_descriptors')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking existing action plan:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing action plan:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
