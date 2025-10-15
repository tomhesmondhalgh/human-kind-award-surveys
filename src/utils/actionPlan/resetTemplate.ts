import { supabase } from '@/lib/supabase';
import { INITIAL_DESCRIPTORS } from '@/lib/supabase/mockData';

export const resetSectionToTemplate = async (
  organizationId: string,
  section: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Resetting section "${section}" for organization ${organizationId}`);
    
    // Delete all existing descriptors for this section
    const { error: deleteError } = await supabase
      .from('action_plan_descriptors')
      .delete()
      .eq('organization_id', organizationId)
      .eq('section', section);

    if (deleteError) {
      console.error('Error deleting descriptors:', deleteError);
      throw deleteError;
    }

    console.log('Descriptors deleted, re-initializing section...');
    
    // Get the authenticated user ID for the user_id field
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No authenticated user found' };
    }
    
    // Get the initial descriptors for this specific section
    const sectionDescriptors = INITIAL_DESCRIPTORS.filter(d => d.section === section);
    
    // Create descriptors for the organization
    const descriptorsToInsert = sectionDescriptors.map(descriptor => ({
      ...descriptor,
      organization_id: organizationId,
      user_id: user.id
    }));
    
    const { error: insertError } = await supabase
      .from('action_plan_descriptors')
      .insert(descriptorsToInsert);
    
    if (insertError) {
      console.error('Error re-initializing section:', insertError);
      return { success: false, error: insertError.message };
    }
    
    console.log('Section reset successfully');
    return { success: true };
  } catch (error) {
    console.error('Error resetting section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
