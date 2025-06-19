
import { supabase } from '@/integrations/supabase/client';

/**
 * Validates and refreshes the current session if needed
 */
export async function validateAndRefreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation error:', error);
      return { session: null, error };
    }

    if (!session) {
      console.log('No session found');
      return { session: null, error: null };
    }

    // Check if session is expired or expires soon (within 1 minute)
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (expiresAt <= now + oneMinute) {
      console.log('Session expired or expires soon, refreshing...');
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        return { session: null, error: refreshError };
      }

      console.log('Session refreshed successfully');
      return { session: data.session, error: null };
    }

    return { session, error: null };
  } catch (error) {
    console.error('Unexpected error during session validation:', error);
    return { session: null, error: error as Error };
  }
}

/**
 * Ensures user is authenticated, throwing error if not
 */
export async function requireAuthentication() {
  const { session, error } = await validateAndRefreshSession();
  
  if (error || !session?.user) {
    throw new Error('Authentication required - please log in');
  }
  
  return session;
}

/**
 * Clean up auth state completely
 */
export function cleanupAuthState() {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if available
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('Auth state cleaned up');
  } catch (error) {
    console.error('Error cleaning up auth state:', error);
  }
}
