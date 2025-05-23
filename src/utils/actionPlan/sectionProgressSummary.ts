
import { supabase } from '../../lib/supabase';

interface SectionStats {
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  notApplicableCount: number;
  blockedCount: number;
  totalCount: number;
  percentComplete: number;
}

interface SectionSummary {
  key: string;
  title: string;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  notApplicableCount: number;
  blockedCount: number;
  totalCount: number;
  percentComplete: number;
}

export async function getSectionProgressSummary(organizationId: string) {
  try {
    console.log('Getting section progress summary for organization:', organizationId);
    
    const { data: descriptors, error } = await supabase
      .from('action_plan_descriptors')
      .select('section, status')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('Error fetching descriptors for progress summary:', error);
      return { success: false, error, data: null };
    }
    
    if (!descriptors || descriptors.length === 0) {
      console.log('No descriptors found for organization:', organizationId);
      return { success: true, data: [] };
    }
    
    // Group by section and count statuses
    const sectionStats = descriptors.reduce((acc: Record<string, SectionStats>, descriptor) => {
      const section = descriptor.section;
      if (!acc[section]) {
        acc[section] = {
          notStartedCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          notApplicableCount: 0,
          blockedCount: 0,
          totalCount: 0,
          percentComplete: 0
        };
      }
      
      acc[section].totalCount++;
      
      switch (descriptor.status) {
        case 'Not Started':
          acc[section].notStartedCount++;
          break;
        case 'In Progress':
          acc[section].inProgressCount++;
          break;
        case 'Completed':
          acc[section].completedCount++;
          break;
        case 'Not Applicable':
          acc[section].notApplicableCount++;
          break;
        case 'Blocked':
          acc[section].blockedCount++;
          break;
      }
      
      // Calculate percentage complete (excluding Not Applicable items)
      const applicableItems = acc[section].totalCount - acc[section].notApplicableCount;
      acc[section].percentComplete = applicableItems > 0 
        ? Math.round((acc[section].completedCount / applicableItems) * 100) 
        : 0;
      
      return acc;
    }, {});
    
    // Convert to array format with section titles
    const sectionTitles: { [key: string]: string } = {
      'leadership': 'Leadership and Management',
      'staff_wellbeing': 'Staff Wellbeing and Support',
      'workload_management': 'Workload Management',
      'professional_development': 'Professional Development',
      'communication': 'Communication and Engagement',
      'policies_procedures': 'Policies and Procedures'
    };
    
    const result: SectionSummary[] = Object.entries(sectionStats).map(([key, stats]) => ({
      key,
      title: sectionTitles[key] || key,
      ...stats
    }));
    
    console.log('Section progress summary:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in getSectionProgressSummary:', error);
    return { success: false, error, data: null };
  }
}
