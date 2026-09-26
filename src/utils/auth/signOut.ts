import { supabase } from '@/integrations/supabase/client';

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    // The server call failed (e.g. offline or the session had already
    // expired). Still forget the session in this browser so the user is
    // signed out here.
    console.error('Sign out error:', error);
    await supabase.auth.signOut({ scope: 'local' });
  }
}
