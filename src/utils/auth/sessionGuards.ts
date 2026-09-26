
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { validateAndRefreshSession } from './sessionUtils';

interface SessionRequirement {
  requireValid: boolean;
  requireFresh?: boolean; // Require session to be refreshed within last 5 minutes
  maxAge?: number; // Maximum session age in minutes
}

interface OperationResult<T> {
  data: T | null;
  error: Error | null;
  sessionIssue?: boolean;
}

const DEFAULT_REQUIREMENT: SessionRequirement = {
  requireValid: true,
  requireFresh: false,
  maxAge: 60 // 1 hour
};

/**
 * Higher-order function that wraps operations with session validation
 */
export function withSessionValidation<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  requirement: Partial<SessionRequirement> = {}
) {
  const config = { ...DEFAULT_REQUIREMENT, ...requirement };

  return async (...args: T): Promise<OperationResult<R>> => {
    try {
      // Step 1: Validate current session
      const sessionCheck = await validateSessionForOperation(config);
      
      if (!sessionCheck.isValid) {
        console.error('🚫 Operation blocked due to invalid session:', sessionCheck.reason);
        return {
          data: null,
          error: new Error(`Session validation failed: ${sessionCheck.reason}`),
          sessionIssue: true
        };
      }

      // Step 2: Execute the operation
      console.log('✅ Session validated, executing operation');
      const result = await operation(...args);
      
      return {
        data: result,
        error: null,
        sessionIssue: false
      };
    } catch (error) {
      console.error('💥 Operation failed:', error);
      
      // Check if error is session-related
      const isSessionError = isAuthenticationError(error);
      
      if (isSessionError) {
        console.log('🔄 Attempting session recovery for operation');
        
        // Try to refresh session and retry once
        const { session, error: refreshError } = await validateAndRefreshSession();
        
        if (session && !refreshError) {
          try {
            console.log('🔄 Retrying operation after session refresh');
            const retryResult = await operation(...args);
            return {
              data: retryResult,
              error: null,
              sessionIssue: false
            };
          } catch (retryError) {
            console.error('💥 Operation failed even after session refresh:', retryError);
            return {
              data: null,
              error: retryError as Error,
              sessionIssue: true
            };
          }
        }
      }

      return {
        data: null,
        error: error as Error,
        sessionIssue: isSessionError
      };
    }
  };
}

/**
 * Validates session meets the specified requirements
 */
async function validateSessionForOperation(requirement: SessionRequirement): Promise<{
  isValid: boolean;
  session?: Session | null;
  reason?: string;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        isValid: false,
        reason: `Session retrieval error: ${error.message}`
      };
    }

    if (!session && requirement.requireValid) {
      return {
        isValid: false,
        reason: 'No valid session found'
      };
    }

    if (!session) {
      return { isValid: true, session: null };
    }

    // Check session expiry
    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    
    if (expiresAt <= now) {
      return {
        isValid: false,
        session,
        reason: 'Session has expired'
      };
    }

    // Check if session is fresh enough
    if (requirement.requireFresh) {
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const sessionAge = now - (session.refresh_token ? 0 : expiresAt - (60 * 60 * 1000)); // Estimate session creation time
      
      if (sessionAge > fiveMinutesAgo) {
        return {
          isValid: false,
          session,
          reason: 'Session is not fresh enough (older than 5 minutes)'
        };
      }
    }

    // Check maximum age
    if (requirement.maxAge) {
      const maxAgeMs = requirement.maxAge * 60 * 1000;
      const sessionAge = now - (expiresAt - (60 * 60 * 1000)); // Estimate session creation time
      
      if (sessionAge > maxAgeMs) {
        return {
          isValid: false,
          session,
          reason: `Session is too old (older than ${requirement.maxAge} minutes)`
        };
      }
    }

    return {
      isValid: true,
      session
    };
  } catch (error) {
    return {
      isValid: false,
      reason: `Session validation error: ${(error as Error).message}`
    };
  }
}

/**
 * Checks if an error is authentication-related
 */
function isAuthenticationError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  const authErrorIndicators = [
    'unauthorized',
    'forbidden',
    'authentication',
    'session',
    'token',
    'expired',
    'invalid',
    'jwt',
    'auth'
  ];

  return authErrorIndicators.some(indicator => 
    errorMessage.includes(indicator) || errorCode.includes(indicator)
  );
}

/**
 * Pre-flight session check for critical operations
 */
export async function requireValidSession(): Promise<Session> {
  const { session, error } = await validateAndRefreshSession();
  
  if (error || !session) {
    throw new Error(`Valid session required: ${error?.message || 'No session available'}`);
  }
  
  return session;
}

/**
 * Session-aware database operation wrapper
 */
export function withDatabaseSession<T extends any[], R>(
  dbOperation: (...args: T) => Promise<R>
) {
  return withSessionValidation(dbOperation, {
    requireValid: true,
    requireFresh: false,
    maxAge: 30 // 30 minutes for database operations
  });
}

/**
 * Session-aware API operation wrapper
 */
export function withApiSession<T extends any[], R>(
  apiOperation: (...args: T) => Promise<R>
) {
  return withSessionValidation(apiOperation, {
    requireValid: true,
    requireFresh: true, // API calls should use fresh sessions
    maxAge: 15 // 15 minutes for API operations
  });
}
