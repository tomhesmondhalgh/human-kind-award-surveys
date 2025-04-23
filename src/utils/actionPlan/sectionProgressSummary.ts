
import { supabase } from "../../lib/supabase";
import { ACTION_PLAN_SECTIONS } from "../../types/actionPlan";

export interface SectionSummary {
  key: string;
  title: string;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  blockedCount: number;
  notApplicableCount: number;
  percentComplete: number;
}

/**
 * Get section progress summary
 */
export const getSectionProgressSummary = async (
  userId: string
): Promise<{ success: boolean, data?: SectionSummary[], error?: string }> => {
  try {
    console.log('Fetching section progress summary for user:', userId);

    const { data, error } = await supabase
      .from('action_plan_descriptors')
      .select('section, status')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching descriptors for summary:', error);
      return { success: false, error: error.message };
    }

    const sections: Record<string, SectionSummary> = {};

    data.forEach((descriptor: any) => {
      const section = descriptor.section;

      if (!sections[section]) {
        sections[section] = {
          key: section.toLowerCase().replace(/\s+/g, '_'),
          title: section,
          totalCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          notStartedCount: 0,
          blockedCount: 0,
          notApplicableCount: 0,
          percentComplete: 0
        };
      }

      sections[section].totalCount++;

      if (descriptor.status === 'Completed') {
        sections[section].completedCount++;
      } else if (descriptor.status === 'In Progress') {
        sections[section].inProgressCount++;
      } else if (descriptor.status === 'Not Started') {
        sections[section].notStartedCount++;
      } else if (descriptor.status === 'Blocked') {
        sections[section].blockedCount++;
      } else if (descriptor.status === 'Not Applicable') {
        sections[section].notApplicableCount++;
      }
    });

    Object.values(sections).forEach(section => {
      const applicableCount = section.totalCount - section.notApplicableCount;
      section.percentComplete = applicableCount > 0 
        ? Math.round((section.completedCount / applicableCount) * 100) 
        : 0;
    });

    return { 
      success: true, 
      data: Object.values(sections)
    };
  } catch (error) {
    console.error('Error calculating section progress summary:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
