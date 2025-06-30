
import { supabase } from '@/integrations/supabase/client';
import { getBestStorage, cleanupAllAuthStorage, detectStorageCapabilities } from './storageUtils';

/**
 * Enhanced session validation with storage fallback mechanisms
 */
export async function validateAndRefreshSession() {
  try {
    console.log('🔍 Enhanced session validation starting...');
    
    // Check storage capabilities first
    const storageType = getBestStorage();
    console.log(`📱 Using storage type: ${storageType}`);
    
    // Try standard session retrieval
    let sessionData;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      sessionData = data;
    } catch (sessionError) {
      console.warn('⚠️ Standard session retrieval failed:', sessionError);
      
      // Fallback: Try direct user verification
      if (storageType === 'none') {
        console.log('🔄 No storage available, trying direct user verification...');
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.log('❌ No valid user found via direct verification');
          return { session: null, error: userError };
        }
        
        console.log('✅ User verified directly, but session unavailable');
        return { session: null, error: new Error('Session unavailable due to storage restrictions') };
      }
      
      throw sessionError;
    }

    if (!sessionData.session) {
      console.log('ℹ️ No session found during validation');
      return { session: null, error: null };
    }

    // Check if session is expired or expires soon (within 1 minute)
    const expiresAt = sessionData.session.expires_at ? sessionData.session.expires_at * 1000 : 0;
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (expiresAt <= now + oneMinute) {
      console.log('⏰ Session expired or expires soon, attempting refresh...');
      
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Session refresh failed:', refreshError);
          
          // If refresh fails and storage is limited, clean up and suggest re-login
          if (storageType === 'sessionStorage' || storageType === 'none') {
            console.log('🧹 Cleaning up failed session with limited storage');
            cleanupAllAuthStorage();
          }
          
          return { session: null, error: refreshError };
        }

        console.log('✅ Session refreshed successfully');
        return { session: data.session, error: null };
      } catch (refreshError) {
        console.error('💥 Session refresh threw exception:', refreshError);
        return { session: null, error: refreshError as Error };
      }
    }

    console.log('✅ Session is valid');
    return { session: sessionData.session, error: null };
  } catch (error) {
    console.error('💥 Unexpected error during enhanced session validation:', error);
    return { session: null, error: error as Error };
  }
}

/**
 * Enhanced authentication requirement check with storage awareness
 */
export async function requireAuthentication() {
  const { session, error } = await validateAndRefreshSession();
  
  if (error || !session?.user) {
    const capabilities = detectStorageCapabilities();
    
    let errorMsg = 'Authentication required - please log in';
    
    // Provide more helpful error messages based on storage capabilities
    if (!capabilities.localStorage && !capabilities.sessionStorage) {
      errorMsg = 'Authentication unavailable - browser storage is blocked. Please enable cookies and local storage, then log in again.';
    } else if (!capabilities.localStorage && capabilities.sessionStorage) {
      errorMsg = 'Authentication limited - localStorage is blocked. Session will not persist between browser sessions.';
    }
    
    console.error('🚫', errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log('✅ Authentication verified for user:', session.user.email);
  return session;
}

/**
 * Enhanced auth state cleanup with comprehensive storage handling
 */
export function cleanupAuthState() {
  try {
    console.log('🧹 Starting comprehensive enhanced auth state cleanup...');
    
    // Use the new comprehensive cleanup function
    cleanupAllAuthStorage();
    
    console.log('✅ Enhanced auth state cleanup complete');
  } catch (error) {
    console.error('❌ Error during enhanced auth state cleanup:', error);
  }
}

/**
 * Enhanced forced authentication reset with progressive recovery
 */
export async function forceAuthReset() {
  console.log('🔄 Forcing enhanced authentication reset...');
  
  try {
    // Step 1: Check storage capabilities
    const capabilities = detectStorageCapabilities();
    console.log('📊 Storage capabilities during reset:', capabilities);
    
    // Step 2: Enhanced cleanup first
    cleanupAuthState();
    
    // Step 3: Attempt progressive sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✅ Global sign out successful');
    } catch (signOutError) {
      console.warn('⚠️ Global sign out failed (may be expected):', signOutError);
      
      // If storage is completely blocked, this is expected
      if (!capabilities.localStorage && !capabilities.sessionStorage) {
        console.log('ℹ️ Sign out failure expected due to storage restrictions');
      }
    }
    
    // Step 4: Final cleanup
    cleanupAuthState();
    
    // Step 5: Provide guidance based on storage capabilities
    let guidance = 'Complete authentication reset finished';
    if (!capabilities.localStorage) {
      guidance += '. Note: localStorage is blocked - consider adjusting browser settings for full functionality.';
    }
    
    console.log(`✅ ${guidance}`);
    console.log('💡 Recommendation: Refresh the page for a completely clean state');
    
    return { success: true, capabilities, guidance };
  } catch (error) {
    console.error('❌ Error during enhanced forced auth reset:', error);
    return { success: false, error, capabilities: detectStorageCapabilities() };
  }
}

/**
 * Check if the current auth setup is working optimally
 */
export function checkAuthHealth() {
  const capabilities = detectStorageCapabilities();
  const storageType = getBestStorage();
  
  const health = {
    overall: 'good' as 'good' | 'degraded' | 'poor',
    issues: [] as string[],
    recommendations: [] as string[],
    capabilities,
    storageType
  };

  // Assess overall health
  if (!capabilities.localStorage) {
    health.overall = capabilities.sessionStorage ? 'degraded' : 'poor';
    health.issues.push('localStorage is blocked by browser tracking prevention');
    
    if (capabilities.sessionStorage) {
      health.recommendations.push('Consider adjusting browser settings to allow localStorage for persistent sessions');
    } else {
      health.issues.push('sessionStorage is also blocked');
      health.recommendations.push('Enable browser storage in privacy settings to restore full authentication functionality');
    }
  }

  if (!capabilities.cookies) {
    health.issues.push('Cookies are blocked');
    health.recommendations.push('Enable cookies for enhanced security features');
  }

  console.log('🏥 Auth health check:', health);
  return health;
}
