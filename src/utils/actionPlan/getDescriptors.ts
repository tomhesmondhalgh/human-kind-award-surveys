
import { supabase } from '../../lib/supabase';
import { ActionPlanDescriptor } from '../../types/actionPlan';

export async function getActionPlanDescriptors(
  organizationId: string, 
  section?: string
): Promise<{ success: boolean; data: ActionPlanDescriptor[] | null; error: any }> {
  try {
    console.log('Fetching action plan descriptors for organization:', organizationId, 'section:', section);
    
    let query = supabase
      .from('action_plan_descriptors')
      .select('*')
      .eq('organization_id', organizationId)
      .order('index_number', { ascending: true });
    
    if (section) {
      query = query.eq('section', section);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching action plan descriptors:', error);
      return { success: false, data: null, error };
    }
    
    console.log('Fetched descriptors:', data);
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error in getActionPlanDescriptors:', error);
    return { success: false, data: null, error };
  }
}
