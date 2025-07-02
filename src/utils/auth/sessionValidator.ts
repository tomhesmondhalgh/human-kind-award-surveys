
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface SessionValidationResult {
  isValid: boolean;
  session: Session | null;
  error?: string;
  needsRefresh?: boolean;
}

/**
 * Validates that the current session JWT is properly synchronized with the database
 */
export async function validateSessionWithDatabase(): Promise<SessionValidationResult> {
  try {
    console.log('🔍 Validating session with database...');
    
    // Step 1: Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session retrieval error:', sessionError);
      return { isValid: false, session: null, error: sessionError.message };
    }
    
    if (!session) {
      console.log('ℹ️ No session found');
      return { isValid: false, session: null, error: 'No active session' };
    }
    
    // Step 2: Test JWT token with database by calling auth.getUser()
    console.log('🔍 Testing JWT token with database...');
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ JWT token validation failed:', authError);
      return {
        isValid: false,
        session,
        error: 'JWT token not recognized by database',
        needsRefresh: true
      };
    }
    
    if (!userData.user) {
      console.error('❌ auth.getUser() returned null');
      return {
        isValid: false,
        session,
        error: 'Database cannot access user context',
        needsRefresh: true
      };
    }
    
    // Step 3: Verify the user ID matches the session
    if (userData.user.id !== session.user.id) {
      console.error('❌ Session user mismatch:', {
        sessionUserId: session.user.id,
        dbUserId: userData.user.id
      });
      return {
        isValid: false,
        session,
        error: 'Session user mismatch',
        needsRefresh: true
      };
    }
    
    console.log('✅ Session validation successful');
    return { isValid: true, session };
    
  } catch (error) {
    console.error('💥 Session validation error:', error);
    return {
      isValid: false,
      session: null,
      error: `Validation failed: ${(error as Error).message}`
    };
  }
}

/**
 * Forces a session refresh and validates the new session
 */
export async function refreshAndValidateSession(): Promise<SessionValidationResult> {
  try {
    console.log('🔄 Forcing session refresh...');
    
    // Step 1: Force token refresh
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('❌ Session refresh failed:', refreshError);
      return { isValid: false, session: null, error: refreshError.message };
    }
    
    if (!refreshData.session) {
      console.error('❌ No session after refresh');
      return { isValid: false, session: null, error: 'Session refresh returned no session' };
    }
    
    console.log('✅ Session refreshed successfully');
    
    // Step 2: Wait a moment for the new token to propagate
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 3: Validate the refreshed session
    return await validateSessionWithDatabase();
    
  } catch (error) {
    console.error('💥 Session refresh error:', error);
    return {
      isValid: false,
      session: null,
      error: `Refresh failed: ${(error as Error).message}`
    };
  }
}

/**
 * Ensures a valid session exists before performing database operations
 */
export async function ensureValidSession(): Promise<Session> {
  console.log('🛡️ Ensuring valid session for database operations...');
  
  // Step 1: Try current session
  let validation = await validateSessionWithDatabase();
  
  if (validation.isValid && validation.session) {
    console.log('✅ Current session is valid');
    return validation.session;
  }
  
  // Step 2: Try refreshing if needed
  if (validation.needsRefresh) {
    console.log('🔄 Session needs refresh, attempting...');
    validation = await refreshAndValidateSession();
    
    if (validation.isValid && validation.session) {
      console.log('✅ Session valid after refresh');
      return validation.session;
    }
  }
  
  // Step 3: Failed to establish valid session
  console.error('❌ Failed to establish valid session');
  throw new Error(validation.error || 'Unable to establish valid session');
}
