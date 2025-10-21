
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
    
    // Delete any existing descriptors for this organization (Option A: clean slate)
    console.log('Removing any existing descriptors for organization:', organizationId);
    const { error: deleteError } = await supabase
      .from('action_plan_descriptors')
      .delete()
      .eq('organization_id', organizationId);
    
    if (deleteError) {
      console.error('Error deleting existing descriptors:', deleteError);
      // Continue anyway - might just be no existing descriptors
    }
    
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
