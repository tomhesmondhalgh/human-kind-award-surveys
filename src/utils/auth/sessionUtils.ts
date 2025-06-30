
import { supabase } from '@/integrations/supabase/client';

/**
 * Validates and refreshes the current session if needed
 */
export async function validateAndRefreshSession() {
  try {
    console.log('🔍 Validating and refreshing session...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session validation error:', error);
      return { session: null, error };
    }

    if (!session) {
      console.log('❌ No session found during validation');
      return { session: null, error: null };
    }

    // Check if session is expired or expires soon (within 1 minute)
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (expiresAt <= now + oneMinute) {
      console.log('⏰ Session expired or expires soon, refreshing...');
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Session refresh error:', refreshError);
        return { session: null, error: refreshError };
      }

      console.log('✅ Session refreshed successfully');
      return { session: data.session, error: null };
    }

    console.log('✅ Session is valid');
    return { session, error: null };
  } catch (error) {
    console.error('💥 Unexpected error during session validation:', error);
    return { session: null, error: error as Error };
  }
}

/**
 * Ensures user is authenticated, throwing error if not
 */
export async function requireAuthentication() {
  const { session, error } = await validateAndRefreshSession();
  
  if (error || !session?.user) {
    const errorMsg = 'Authentication required - please log in';
    console.error('🚫', errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log('✅ Authentication verified for user:', session.user.email);
  return session;
}

/**
 * Clean up auth state completely - enhanced version
 */
export function cleanupAuthState() {
  try {
    console.log('🧹 Starting comprehensive auth state cleanup...');
    
    // Get all storage keys before cleanup for logging
    const localStorageKeys = Object.keys(localStorage);
    const sessionStorageKeys = typeof sessionStorage !== 'undefined' ? Object.keys(sessionStorage) : [];
    
    console.log('🗄️ Current localStorage keys:', localStorageKeys.filter(k => 
      k.includes('supabase') || k.includes('sb-')
    ));
    
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    let removedLocalKeys = 0;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
        removedLocalKeys++;
      }
    });
    
    // Remove from sessionStorage if available
    let removedSessionKeys = 0;
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
          removedSessionKeys++;
        }
      });
    }
    
    console.log(`✅ Auth state cleanup complete - removed ${removedLocalKeys} localStorage keys and ${removedSessionKeys} sessionStorage keys`);
  } catch (error) {
    console.error('❌ Error cleaning up auth state:', error);
  }
}

/**
 * Force a complete authentication reset
 */
export async function forceAuthReset() {
  console.log('🔄 Forcing complete authentication reset...');
  
  try {
    // Step 1: Clean up local storage first
    cleanupAuthState();
    
    // Step 2: Attempt global sign out (may fail if session is corrupted)
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✅ Global sign out successful');
    } catch (signOutError) {
      console.warn('⚠️ Global sign out failed (expected if session corrupted):', signOutError);
    }
    
    // Step 3: Clean up again after sign out
    cleanupAuthState();
    
    console.log('✅ Complete authentication reset finished');
    
    // Step 4: Recommend page refresh
    console.log('💡 Recommendation: Refresh the page for a completely clean state');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error during forced auth reset:', error);
    return { success: false, error };
  }
}
