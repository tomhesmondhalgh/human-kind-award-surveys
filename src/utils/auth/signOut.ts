import { supabase } from '@/integrations/supabase/client';

export async function signOutUser(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }

    console.log('User signed out successfully');
  } catch (error) {
    console.error('Error during sign out:', error);
    // Handle error as needed
  }
}
