
import { supabase } from '../../lib/supabase';
import { ActionPlanDescriptor } from '../../types/actionPlan';

export async function getActionPlanDescriptors(
  organizationId: string, 
  section?: string
): Promise<{ success: boolean; data: ActionPlanDescriptor[] | null; error: any }> {
  try {
    console.log('Fetching action plan descriptors for organization:', organizationId, 'section:', section);
    
    // Build the query with a LEFT JOIN to count progress notes
    let query = supabase
      .from('action_plan_descriptors')
      .select(`
        *,
        progress_notes_count:action_plan_progress_notes(count)
      `)
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
    
    // Transform the data to include progress_notes_count as a number
    const transformedData = data?.map((descriptor: any) => ({
      ...descriptor,
      progress_notes_count: descriptor.progress_notes_count?.[0]?.count || 0
    }));
    
    console.log('Fetched descriptors:', transformedData);
    return { success: true, data: transformedData, error: null };
  } catch (error) {
    console.error('Error in getActionPlanDescriptors:', error);
    return { success: false, data: null, error };
  }
}
