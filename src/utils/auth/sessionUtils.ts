
import { supabase } from '@/integrations/supabase/client';

/**
 * Detect if localStorage is available and functioning
 */
export function detectStorageAvailability(): { localStorage: boolean; sessionStorage: boolean } {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    
    const sessionTest = sessionStorage ? (() => {
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    })() : false;
    
    return { localStorage: true, sessionStorage: sessionTest };
  } catch (error) {
    console.warn('Storage detection failed:', error);
    return { localStorage: false, sessionStorage: false };
  }
}

/**
 * Enhanced session validation with retry logic
 */
export async function validateAndRefreshSession(maxRetries = 2): Promise<{
  session: any;
  error: any;
  retryCount?: number;
}> {
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`Session validation attempt ${retryCount + 1}/${maxRetries + 1}`);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error(`Session validation error (attempt ${retryCount + 1}):`, error);
        
        // If it's a storage-related error and we have retries left, try again
        if (error.message?.includes('localStorage') && retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          continue;
        }
        
        return { session: null, error, retryCount };
      }

      if (!session) {
        console.log('No session found');
        return { session: null, error: null, retryCount };
      }

      // Check if session is expired or expires soon (within 2 minutes for better buffer)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const twoMinutes = 2 * 60 * 1000;

      if (expiresAt <= now + twoMinutes) {
        console.log('Session expired or expires soon, attempting refresh...');
        
        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Session refresh error:', refreshError);
            
            // If refresh fails and we have retries left, try the whole process again
            if (retryCount < maxRetries) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
            
            return { session: null, error: refreshError, retryCount };
          }

          console.log('Session refreshed successfully');
          return { session: data.session, error: null, retryCount };
        } catch (refreshException) {
          console.error('Exception during session refresh:', refreshException);
          
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          
          return { session: null, error: refreshException as Error, retryCount };
        }
      }

      return { session, error: null, retryCount };
    } catch (error) {
      console.error(`Unexpected error during session validation (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      
      return { session: null, error: error as Error, retryCount };
    }
  }
  
  return { session: null, error: new Error('Max retries exceeded'), retryCount };
}

/**
 * Enhanced authentication requirement with better error handling
 */
export async function requireAuthentication(operation = 'this action'): Promise<any> {
  const storageStatus = detectStorageAvailability();
  
  if (!storageStatus.localStorage) {
    console.warn('localStorage not available - auth may be unreliable');
  }
  
  const { session, error, retryCount } = await validateAndRefreshSession();
  
  if (error || !session?.user) {
    const errorMessage = error?.message?.includes('localStorage') 
      ? 'Authentication failed due to browser privacy settings. Please try refreshing the page or using a different browser.'
      : `Authentication required for ${operation} - please log in`;
    
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).retryCount = retryCount;
    (enhancedError as any).storageAvailable = storageStatus.localStorage;
    
    throw enhancedError;
  }
  
  return session;
}

/**
 * Pre-flight authentication check for critical operations
 */
export async function preflightAuthCheck(operationName: string): Promise<{
  success: boolean;
  session?: any;
  error?: any;
  needsRefresh?: boolean;
  storageIssues?: boolean;
}> {
  console.log(`Pre-flight auth check for: ${operationName}`);
  
  const storageStatus = detectStorageAvailability();
  
  try {
    const { session, error, retryCount } = await validateAndRefreshSession();
    
    if (error) {
      return {
        success: false,
        error,
        storageIssues: !storageStatus.localStorage,
        needsRefresh: retryCount && retryCount > 0
      };
    }
    
    if (!session?.user) {
      return {
        success: false,
        error: new Error('No authenticated user found'),
        needsRefresh: true
      };
    }
    
    console.log(`Pre-flight auth check passed for: ${operationName}`);
    return {
      success: true,
      session
    };
  } catch (error) {
    console.error(`Pre-flight auth check failed for ${operationName}:`, error);
    return {
      success: false,
      error: error as Error,
      storageIssues: !storageStatus.localStorage
    };
  }
}

/**
 * Enhanced auth state cleanup with better error handling
 */
export function cleanupAuthState(): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    console.log('Starting enhanced auth state cleanup...');
    
    // Check storage availability first
    const storageStatus = detectStorageAvailability();
    
    if (!storageStatus.localStorage) {
      errors.push('localStorage not accessible - some cleanup may be incomplete');
    }
    
    // List of possible auth-related keys
    const authKeys = [
      'supabase.auth.token',
      'sb-bagaaqkmewkuwtudwnqw-auth-token',
      'sb-bagaaqkmewkuwtudwnqw-auth-token-code-verifier'
    ];
    
    // Remove known auth keys
    authKeys.forEach(key => {
      try {
        if (storageStatus.localStorage) {
          localStorage.removeItem(key);
          console.log(`Removed auth key: ${key}`);
        }
      } catch (error) {
        const errorMsg = `Failed to remove auth key ${key}: ${error}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
      }
    });
    
    // Remove all Supabase auth keys from localStorage
    if (storageStatus.localStorage) {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            try {
              localStorage.removeItem(key);
              console.log(`Removed dynamic auth key: ${key}`);
            } catch (error) {
              const errorMsg = `Failed to remove dynamic auth key ${key}: ${error}`;
              console.warn(errorMsg);
              errors.push(errorMsg);
            }
          }
        });
      } catch (error) {
        const errorMsg = `Failed to iterate localStorage keys: ${error}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Remove from sessionStorage if available
    if (storageStatus.sessionStorage) {
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            try {
              sessionStorage.removeItem(key);
              console.log(`Removed session auth key: ${key}`);
            } catch (error) {
              const errorMsg = `Failed to remove session auth key ${key}: ${error}`;
              console.warn(errorMsg);
              errors.push(errorMsg);
            }
          }
        });
      } catch (error) {
        const errorMsg = `Failed to iterate sessionStorage keys: ${error}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`Auth state cleanup completed with ${errors.length} errors`);
    return { success: errors.length === 0, errors };
  } catch (error) {
    const errorMsg = `Critical error during auth state cleanup: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { success: false, errors };
  }
}

/**
 * Enhanced force refresh with better error handling
 */
export function forceAuthRefresh(reason = 'manual'): void {
  console.log(`Force auth refresh triggered: ${reason}`);
  
  const { success, errors } = cleanupAuthState();
  
  if (!success) {
    console.warn('Auth cleanup had errors:', errors);
  }
  
  // Small delay to ensure cleanup is complete
  setTimeout(() => {
    const currentUrl = window.location.pathname + window.location.search;
    console.log(`Forcing page refresh from ${currentUrl}`);
    window.location.href = currentUrl;
  }, 100);
}
