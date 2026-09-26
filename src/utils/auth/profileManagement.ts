import { supabase } from '@/integrations/supabase/client';

export async function completeUserProfile(userId: string, userData: any): Promise<{ error: any; success: boolean }> {
  try {
    console.log('Completing user profile for user ID:', userId, 'with data:', userData);

    const { error } = await supabase.rpc(
      'create_or_update_profile',
      {
        profile_id: userId,
        profile_first_name: userData?.firstName || '',
        profile_last_name: userData?.lastName || '',
        profile_job_title: userData?.jobTitle || '',
        profile_school_name: userData?.schoolName || '',
        profile_school_address: userData?.schoolAddress || ''
      }
    );

    if (error) {
      console.error('Error completing profile:', error);
      return { error, success: false };
    }

    console.log('User profile completed successfully for user ID:', userId);
    return { error: null, success: true };
  } catch (error: any) {
    console.error('Error during profile completion:', error);
    return { error: error as Error, success: false };
  }
}
