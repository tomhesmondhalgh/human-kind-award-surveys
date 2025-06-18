
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
 * Clean up auth state completely - improved version with better error handling
 */
export function cleanupAuthState() {
  try {
    console.log('Starting comprehensive auth state cleanup...');
    
    // List of possible auth-related keys that might exist
    const authKeys = [
      'supabase.auth.token',
      'sb-bagaaqkmewkuwtudwnqw-auth-token',
      'sb-bagaaqkmewkuwtudwnqw-auth-token-code-verifier'
    ];
    
    // Remove known auth keys
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`Removed auth key: ${key}`);
      } catch (error) {
        console.warn(`Failed to remove auth key ${key}:`, error);
      }
    });
    
    // Remove all Supabase auth keys from localStorage
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          try {
            localStorage.removeItem(key);
            console.log(`Removed dynamic auth key: ${key}`);
          } catch (error) {
            console.warn(`Failed to remove dynamic auth key ${key}:`, error);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to iterate localStorage keys:', error);
    }
    
    // Remove from sessionStorage if available
    if (typeof sessionStorage !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            try {
              sessionStorage.removeItem(key);
              console.log(`Removed session auth key: ${key}`);
            } catch (error) {
              console.warn(`Failed to remove session auth key ${key}:`, error);
            }
          }
        });
      } catch (error) {
        console.warn('Failed to iterate sessionStorage keys:', error);
      }
    }
    
    console.log('Auth state cleaned up successfully');
  } catch (error) {
    console.error('Error during auth state cleanup:', error);
  }
}

/**
 * Force refresh the current page after cleanup - useful for hard resets
 */
export function forceAuthRefresh() {
  cleanupAuthState();
  
  // Small delay to ensure cleanup is complete
  setTimeout(() => {
    window.location.href = window.location.pathname;
  }, 100);
}
