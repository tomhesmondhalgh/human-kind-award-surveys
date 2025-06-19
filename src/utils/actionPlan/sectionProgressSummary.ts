
import { supabase } from '../../lib/supabase';
import { ACTION_PLAN_SECTIONS } from '../../types/actionPlan';

export async function getSectionProgressSummary(organizationId: string): Promise<{ success: boolean; data: any[] | null; error: any }> {
  try {
    console.log('Getting section progress summary for organization:', organizationId);
    
    const { data: descriptors, error } = await supabase
      .from('action_plan_descriptors')
      .select('section, status')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('Error fetching descriptors for summary:', error);
      return { success: false, data: null, error };
    }
    
    if (!descriptors || descriptors.length === 0) {
      console.log('No descriptors found for organization:', organizationId);
      return { success: true, data: [], error: null };
    }
    
    const summaryData = ACTION_PLAN_SECTIONS.map(section => {
      const sectionDescriptors = descriptors.filter(d => d.section === section.title);
      const totalCount = sectionDescriptors.length;
      const completedCount = sectionDescriptors.filter(d => d.status === 'Completed').length;
      const inProgressCount = sectionDescriptors.filter(d => d.status === 'In Progress').length;
      const notStartedCount = sectionDescriptors.filter(d => d.status === 'Not Started').length;
      const blockedCount = sectionDescriptors.filter(d => d.status === 'Blocked').length;
      const notApplicableCount = sectionDescriptors.filter(d => d.status === 'Not Applicable').length;
      const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      return {
        key: section.key,
        title: section.title,
        totalCount,
        completedCount,
        inProgressCount,
        notStartedCount,
        blockedCount,
        notApplicableCount,
        percentComplete
      };
    });
    
    console.log('Summary data calculated successfully', summaryData);
    return { success: true, data: summaryData, error: null };
  } catch (error) {
    console.error('Error in getSectionProgressSummary:', error);
    return { success: false, data: null, error };
  }
}
