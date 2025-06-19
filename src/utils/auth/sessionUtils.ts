
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
 * Comprehensive auth state cleanup - removes all auth-related data
 */
export function cleanupAuthState() {
  try {
    console.log('Starting comprehensive auth state cleanup...');
    
    // List of known Supabase auth keys to remove
    const authKeys = [
      'supabase.auth.token',
      'sb-bagaaqkmewkuwtudwnqw-auth-token',
      'sb-bagaaqkmewkuwtudwnqw-auth-token-code-verifier',
      'supabase.auth.storage',
      'supabase.auth.callback',
      'supabase.auth.pkce.code_verifier'
    ];

    // Remove specific known keys
    authKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`Removing localStorage key: ${key}`);
        localStorage.removeItem(key);
      }
    });

    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || 
          key.includes('sb-bagaaqkmewkuwtudwnqw') || 
          key.includes('sb-') && key.includes('auth')) {
        console.log(`Removing localStorage key: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if available
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || 
            key.includes('sb-bagaaqkmewkuwtudwnqw') || 
            key.includes('sb-') && key.includes('auth')) {
          console.log(`Removing sessionStorage key: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
    }

    // Clear any cached admin status
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('admin_status_')) {
        console.log(`Removing cached admin status: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    console.log('Auth state cleanup completed successfully');
  } catch (error) {
    console.error('Error during auth state cleanup:', error);
  }
}

/**
 * Complete sign out with cleanup
 */
export async function completeSignOut() {
  try {
    console.log('Starting complete sign out process...');
    
    // Step 1: Clean up auth state first
    cleanupAuthState();
    
    // Step 2: Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Supabase global sign out completed');
    } catch (signOutError) {
      console.warn('Supabase sign out failed, but continuing:', signOutError);
    }
    
    // Step 3: Clean up again after sign out
    cleanupAuthState();
    
    console.log('Complete sign out process finished');
    
    // Step 4: Force page reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
    
  } catch (error) {
    console.error('Error during complete sign out:', error);
    // Force redirect even if there's an error
    window.location.href = '/login';
  }
}

/**
 * Clean sign in process with pre-cleanup
 */
export async function cleanSignIn(email: string, password: string) {
  try {
    console.log('Starting clean sign in process...');
    
    // Step 1: Clean up any existing auth state
    cleanupAuthState();
    
    // Step 2: Attempt to sign out any existing sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (signOutError) {
      console.warn('Pre-signin cleanup failed, continuing:', signOutError);
    }
    
    // Step 3: Clean up again
    cleanupAuthState();
    
    // Step 4: Sign in with fresh state
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    
    console.log('Clean sign in successful');
    return { data, error: null };
    
  } catch (error) {
    console.error('Error during clean sign in:', error);
    throw error;
  }
}
