
import { supabase } from '../../lib/supabase';
import { DescriptorStatus } from '../../types/actionPlan';

export async function updateDescriptor(
  id: string,
  updates: {
    key_actions?: string;
    assigned_to?: string;
    deadline?: string;
    status?: DescriptorStatus;
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Updating descriptor:', id, 'with updates:', updates);
    
    const { error } = await supabase
      .from('action_plan_descriptors')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating descriptor:', error);
      return { success: false, error };
    }
    
    console.log('Descriptor updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in updateDescriptor:', error);
    return { success: false, error };
  }
}
