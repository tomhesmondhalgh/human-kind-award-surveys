
import { supabase } from '../../integrations/supabase/client';
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
    console.log('Updating descriptor ID:', id, 'with updates:', updates);
    
    const { error } = await supabase
      .from('action_plan_descriptors')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating descriptor ID:', id, 'Error:', error, 'Code:', error.code, 'Message:', error.message);
      return { success: false, error };
    }
    
    console.log('Descriptor updated successfully. ID:', id, 'Updated fields:', Object.keys(updates).join(', '));
    return { success: true };
  } catch (error) {
    console.error('Exception in updateDescriptor for ID:', id, 'Error:', error);
    return { success: false, error };
  }
}
