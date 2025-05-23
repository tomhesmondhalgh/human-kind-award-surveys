
import { supabase } from '../../lib/supabase';
import { INITIAL_DESCRIPTORS } from '../../lib/supabase/mockData';

export async function initializeActionPlan(organizationId: string): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Initializing action plan for organization:', organizationId);
    
    // Check if descriptors already exist for this organization
    const { data: existingDescriptors } = await supabase
      .from('action_plan_descriptors')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1);
    
    if (existingDescriptors && existingDescriptors.length > 0) {
      console.log('Action plan already initialized for organization:', organizationId);
      return { success: true };
    }
    
    // Create initial descriptors for the organization
    const descriptorsToInsert = INITIAL_DESCRIPTORS.map(descriptor => ({
      ...descriptor,
      organization_id: organizationId,
      user_id: null // Remove user_id as we're now using organization_id
    }));
    
    const { error } = await supabase
      .from('action_plan_descriptors')
      .insert(descriptorsToInsert);
    
    if (error) {
      console.error('Error initializing action plan:', error);
      return { success: false, error };
    }
    
    console.log('Action plan initialized successfully for organization:', organizationId);
    return { success: true };
  } catch (error) {
    console.error('Error in initializeActionPlan:', error);
    return { success: false, error };
  }
}
