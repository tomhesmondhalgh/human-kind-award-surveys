
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
    console.log(`[${new Date().toISOString()}] Updating descriptor ID:`, id, 'with updates:', updates);
    
    // Step 1: Verify we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('No valid session for update. Session error:', sessionError);
      return { 
        success: false, 
        error: { 
          message: 'Your session has expired. Please refresh the page and try again.',
          code: 'INVALID_SESSION'
        } 
      };
    }
    
    // Step 2: Debug - Verify we can see the descriptor before updating
    const { data: checkData } = await supabase
      .from('action_plan_descriptors')
      .select('id, organization_id')
      .eq('id', id)
      .single();

    if (!checkData) {
      console.error(`[${new Date().toISOString()}] Descriptor ${id} not found in database (may have been deleted/reinitialized)`);
      return { 
        success: false, 
        error: { 
          message: 'This item no longer exists. The action plan may have been reset. Please refresh the page.',
          code: 'DESCRIPTOR_NOT_FOUND'
        } 
      };
    }
    
    console.log('Descriptor accessible. Organization ID:', checkData.organization_id);
    
    // Step 3: Perform the update with .select() to get affected rows back
    const { data, error } = await supabase
      .from('action_plan_descriptors')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating descriptor ID:', id, 'Error:', error, 'Code:', error.code, 'Message:', error.message);
      return { success: false, error };
    }
    
    // Step 4: Check if any rows were actually updated
    if (!data || data.length === 0) {
      console.error(`[${new Date().toISOString()}] No rows updated for descriptor ID:`, id, 
        '- Possible causes: RLS policy blocked update, descriptor was deleted, or concurrent modification');
      return { 
        success: false, 
        error: { 
          message: 'Update blocked - you may not have permission to edit this item.',
          code: 'NO_ROWS_UPDATED'
        } 
      };
    }
    
    console.log('Descriptor updated successfully. ID:', id, 'Updated fields:', Object.keys(updates).join(', '), 'Rows affected:', data.length);
    return { success: true };
  } catch (error) {
    console.error('Exception in updateDescriptor for ID:', id, 'Error:', error);
    return { success: false, error };
  }
}
