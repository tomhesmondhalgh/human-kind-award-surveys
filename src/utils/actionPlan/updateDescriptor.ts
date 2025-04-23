
import { supabase } from "../../lib/supabase";
import { ActionPlanDescriptor } from "../../types/actionPlan";

/**
 * Update an action plan descriptor
 */
export const updateDescriptor = async (
  descriptorId: string, 
  updates: Partial<ActionPlanDescriptor>
): Promise<{ success: boolean, error?: string }> => {
  try {
    console.log('Updating descriptor:', descriptorId, updates);

    const { error } = await supabase
      .from('action_plan_descriptors')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', descriptorId);

    if (error) {
      console.error('Error updating descriptor:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating descriptor:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
