
import { supabase } from "../../lib/supabase";
import { ProgressNote } from "../../types/actionPlan";

/**
 * Add a progress note to a descriptor
 */
export const addProgressNote = async (
  descriptorId: string,
  noteText: string
): Promise<{ success: boolean, error?: string }> => {
  try {
    console.log('Adding progress note to descriptor:', descriptorId);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('action_plan_progress_notes')
      .insert({
        descriptor_id: descriptorId,
        note_text: noteText,
        note_date: now,
        created_at: now
      });

    if (error) {
      console.error('Error adding progress note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding progress note:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Get progress notes for a descriptor
 */
export const getProgressNotes = async (
  descriptorId: string
): Promise<{ success: boolean, data?: ProgressNote[], error?: string }> => {
  try {
    console.log('Fetching progress notes for descriptor:', descriptorId);

    const { data, error } = await supabase
      .from('action_plan_progress_notes')
      .select('*')
      .eq('descriptor_id', descriptorId)
      .order('note_date', { ascending: false });

    if (error) {
      console.error('Error fetching progress notes:', error);
      return { success: false, error: error.message };
    }

    const notes = data as unknown as ProgressNote[];

    return { success: true, data: notes };
  } catch (error) {
    console.error('Error fetching progress notes:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
