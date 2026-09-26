
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from './sessionUtils';
import { detectStorageCapabilities, getBestStorage, cleanupAllAuthStorage } from './storageUtils';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000
};

/**
 * Hook for managing authentication state with enhanced fallback mechanisms
 * Provides robust session management even when browser storage is blocked
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [storageCapabilities, setStorageCapabilities] = useState<any>(null);

  /**
   * Exponential backoff delay calculation
   */
  const calculateDelay = (attempt: number, config: RetryConfig): number => {
    const delay = config.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, config.maxDelay);
  };

  /**
   * Retry function with exponential backoff
   */
  const retryWithBackoff = async <T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context: string = 'operation'
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempting ${context} (${attempt}/${config.maxAttempts})`);
        const result = await operation();
        if (attempt > 1) {
          console.log(`✅ ${context} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${context} failed on attempt ${attempt}:`, error);

        if (attempt < config.maxAttempts) {
          const delay = calculateDelay(attempt, config);
          console.log(`⏳ Retrying ${context} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ ${context} failed after ${config.maxAttempts} attempts`);
    throw lastError!;
  };

  /**
   * Verify session via direct API call (fallback method)
   */
  const verifySessionViaAPI = async (): Promise<{ session: Session | null; user: User | null }> => {
    try {
      console.log('🔍 Verifying session via direct API call...');
      
      // Try to get user directly (bypasses storage)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.log('❌ No valid user found via API');
        return { session: null, user: null };
      }

      // If we have a user, try to get the session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ Session retrieval failed, but user exists:', sessionError);
        // User exists but session is problematic - this is a partial success
        return { session: null, user: userData.user };
      }

      console.log('✅ Session verified via API');
      return { session: sessionData.session, user: userData.user };
    } catch (error) {
      console.error('❌ API verification failed:', error);
      throw error;
    }
  };

  /**
   * Enhanced session initialization with progressive fallbacks
   */
  const initializeAuth = async () => {
    try {
      console.log('🚀 Starting enhanced auth initialization...');
      
      // Step 1: Detect storage capabilities
      const capabilities = detectStorageCapabilities();
      setStorageCapabilities(capabilities);
      
      const bestStorage = getBestStorage();
      console.log(`📱 Best available storage: ${bestStorage}`);

      // Step 2: Try standard session retrieval with retry
      try {
        const sessionResult = await retryWithBackoff(
          async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            return data;
          },
          DEFAULT_RETRY_CONFIG,
          'session retrieval'
        );

        if (sessionResult.session) {
          console.log('✅ Session retrieved successfully');
          return { session: sessionResult.session, user: sessionResult.session.user };
        } else {
          console.log('ℹ️ No session found via standard method');
        }
      } catch (sessionError) {
        console.warn('⚠️ Standard session retrieval failed, trying fallback...', sessionError);
      }

      // Step 3: Fallback to direct API verification
      if (bestStorage === 'none') {
        console.log('🔄 No storage available, using API verification...');
        return await verifySessionViaAPI();
      }

      // Step 4: Try API verification anyway as final fallback
      try {
        const apiResult = await verifySessionViaAPI();
        if (apiResult.user) {
          console.log('✅ Fallback API verification successful');
          return apiResult;
        }
      } catch (apiError) {
        console.warn('⚠️ API verification also failed:', apiError);
      }

      // Step 5: No authentication found
      console.log('ℹ️ No valid authentication found');
      return { session: null, user: null };

    } catch (error) {
      console.error('💥 Auth initialization failed completely:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('🔐 Enhanced auth state hook initializing');
    let mounted = true;

    // Enhanced timeout with better error messaging
    const timeoutId = setTimeout(() => {
      if (isLoading && mounted) {
        const capabilities = detectStorageCapabilities();
        const hasAnyStorage = capabilities.localStorage || capabilities.sessionStorage;
        
        if (!hasAnyStorage) {
          console.error('⚠️ Auth timeout: No storage mechanisms available');
          setAuthError(new Error('Browser storage is blocked. Please enable cookies and local storage.'));
        } else {
          console.warn('⚠️ Auth initialization timed out after 10 seconds');
          setAuthError(new Error('Authentication initialization timed out. Please refresh the page.'));
        }
        
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    }, 10000); // Increased timeout to 10 seconds

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event);
      console.log('📊 Session details:', {
        hasSession: !!newSession,
        userId: newSession?.user?.id,
        email: newSession?.user?.email,
        expiresAt: newSession?.expires_at ? new Date(newSession.expires_at * 1000) : null
      });
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in successfully');
          break;
        case 'SIGNED_OUT':
          console.log('🚪 User signed out');
          // Enhanced cleanup for all storage mechanisms
          cleanupAllAuthStorage();
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed');
          break;
        case 'USER_UPDATED':
          console.log('👤 User profile updated');
          break;
        default:
          console.log(`🔔 Auth event: ${event}`);
      }
      
      // Update state with new session data
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      setAuthCheckComplete(true);
      setAuthError(null);
    });

    // Enhanced initial session retrieval
    const initAuth = async () => {
      try {
        const result = await initializeAuth();
        
        if (mounted) {
          setSession(result.session);
          setUser(result.user);
          setIsLoading(false);
          setAuthCheckComplete(true);
          setAuthError(null);
        }
      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        if (mounted) {
          setAuthError(error as Error);
          setIsLoading(false);
          setAuthCheckComplete(true);
          
          // If storage is completely blocked, provide helpful guidance
          const capabilities = detectStorageCapabilities();
          if (!capabilities.localStorage && !capabilities.sessionStorage) {
            setAuthError(new Error(
              'Browser storage is blocked by tracking prevention. ' +
              'Please adjust your browser settings to allow storage for this site.'
            ));
          }
        }
      }
    };
    
    initAuth();

    // Clean up
    return () => {
      console.log('🧹 Cleaning up enhanced auth subscription');
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Enhanced logging for current auth state
  useEffect(() => {
    console.log('📊 Current enhanced auth state:', {
      isAuthenticated: !!user && !!session,
      isLoading,
      authCheckComplete,
      userId: user?.id,
      userEmail: user?.email,
      hasError: !!authError,
      errorMessage: authError?.message,
      storageType: getBestStorage(),
      storageCapabilities
    });
  }, [user, session, isLoading, authCheckComplete, authError, storageCapabilities]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    authCheckComplete,
    authError,
    storageCapabilities
  };
};
