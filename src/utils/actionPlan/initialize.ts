
import { supabase } from '../../integrations/supabase/client';
import { INITIAL_DESCRIPTORS } from '../../lib/supabase/mockData';

export async function initializeActionPlan(organizationId: string): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Initializing action plan for organization:', organizationId);
    
    // Get the authenticated user ID for the user_id field
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No authenticated user found' };
    }
    
    // Check if descriptors already exist before initializing
    console.log('Checking if action plan already has descriptors...');
    const { data: existingDescriptors, error: checkError } = await supabase
      .from('action_plan_descriptors')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing descriptors:', checkError);
      return { success: false, error: checkError };
    }
    
    // If descriptors exist, don't re-initialize
    if (existingDescriptors && existingDescriptors.length > 0) {
      console.log('Action plan already initialized for this organization. Skipping initialization.');
      return { success: true };
    }
    
    console.log('No descriptors found. Initializing with template...');
    
    // Clear ALL descriptor-related cache for this organization more aggressively
    console.log('Clearing all cached data for organization:', organizationId);
    
    const allKeys = Object.keys(localStorage);
    
    // Clear descriptor caches
    const descriptorKeys = allKeys.filter(key => 
      key.includes('descriptors_') && key.includes(organizationId)
    );
    descriptorKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Cleared cache key:', key);
    });
    
    // Also clear any summary or related caches
    const summaryKeys = allKeys.filter(key => 
      key.includes('summary_') && key.includes(organizationId)
    );
    summaryKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Cleared summary cache key:', key);
    });
    
    console.log(`Cleared ${descriptorKeys.length + summaryKeys.length} cache entries for organization`);
    
    // Create initial descriptors for the organization
    const descriptorsToInsert = INITIAL_DESCRIPTORS.map(descriptor => ({
      ...descriptor,
      organization_id: organizationId,
      user_id: user.id
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
