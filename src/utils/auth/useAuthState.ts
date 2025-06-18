
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { detectStorageAvailability } from './sessionUtils';

/**
 * Enhanced hook for managing authentication state with better error handling
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('Enhanced auth state hook initializing');
    let mounted = true;
    let initializationStarted = false;

    // Clear any potential auth errors on mount
    setAuthError(null);
    
    // Check storage availability
    const storageStatus = detectStorageAvailability();
    setStorageAvailable(storageStatus.localStorage);
    
    if (!storageStatus.localStorage) {
      console.warn('localStorage not available - auth may be unreliable');
    }

    // Add a timeout to ensure we don't get stuck in loading state
    const timeoutId = setTimeout(() => {
      if (isLoading && mounted) {
        console.warn('Auth initialization timed out after 3 seconds, completing with current state');
        setIsLoading(false);
        setAuthCheckComplete(true);
        
        if (!storageStatus.localStorage) {
          setAuthError(new Error('Browser privacy settings may be blocking authentication. Please try refreshing the page.'));
        }
      }
    }, 3000);

    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, newSession ? 'has session' : 'no session');
      
      // Update state with new session data
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Clear errors on successful auth state change
      if (newSession) {
        setAuthError(null);
        setRetryCount(0);
      }
      
      // Only set loading to false if initialization has started
      if (initializationStarted) {
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    });

    // Get initial session with retry logic
    const initializeAuth = async (attempt = 1) => {
      if (!mounted) return;
      
      initializationStarted = true;
      const maxAttempts = 3;
      
      try {
        console.log(`Getting initial session (attempt ${attempt}/${maxAttempts})...`);
        
        // First try to get the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error(`Error getting initial session (attempt ${attempt}):`, error);
          
          // If it's a storage-related error and we have attempts left, retry
          if (error.message?.includes('localStorage') && attempt < maxAttempts) {
            console.log(`Retrying session initialization in ${attempt}s...`);
            setTimeout(() => {
              if (mounted) {
                setRetryCount(attempt);
                initializeAuth(attempt + 1);
              }
            }, attempt * 1000);
            return;
          }
          
          setAuthError(error);
          if (mounted) {
            setSession(null);
            setUser(null);
            setIsLoading(false);
            setAuthCheckComplete(true);
          }
          return;
        }
        
        if (mounted) {
          console.log('Initial session retrieved:', 
            data.session ? `Session exists (user: ${data.session.user.email})` : 'No session');
          
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setIsLoading(false);
          setAuthCheckComplete(true);
          setRetryCount(0);
          
          // Clear any previous errors on successful session retrieval
          setAuthError(null);
          
          // Log session details for debugging
          if (data.session) {
            const expiresAt = new Date(data.session.expires_at! * 1000).toISOString();
            const now = new Date().toISOString();
            console.log(`Session expires at ${expiresAt} (now: ${now})`);
            const isExpired = data.session.expires_at! * 1000 < Date.now();
            const expiresWithinTwoMinutes = (data.session.expires_at! * 1000 - Date.now()) < 120000;
            console.log(`Is session expired? ${isExpired}, expires within 2 minutes? ${expiresWithinTwoMinutes}`);
            
            // If session is expired or expiring soon, try to refresh
            if (isExpired || expiresWithinTwoMinutes) {
              console.log('Session expired or expiring soon, attempting refresh...');
              try {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                  console.error('Session refresh failed:', refreshError);
                  // Don't set this as a critical error, user can still try to use the app
                } else if (refreshData.session) {
                  console.log('Session refreshed successfully');
                  setSession(refreshData.session);
                  setUser(refreshData.session.user);
                }
              } catch (refreshErr) {
                console.error('Exception during session refresh:', refreshErr);
                // Don't set this as a critical error
              }
            }
          }
        }
      } catch (error) {
        console.error(`Exception getting initial session (attempt ${attempt}):`, error);
        
        // If we have attempts left and it might be a transient error, retry
        if (attempt < maxAttempts) {
          console.log(`Retrying session initialization in ${attempt}s...`);
          setTimeout(() => {
            if (mounted) {
              setRetryCount(attempt);
              initializeAuth(attempt + 1);
            }
          }, attempt * 1000);
          return;
        }
        
        setAuthError(error as Error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
          setAuthCheckComplete(true);
        }
      }
    };
    
    // Start initialization
    initializeAuth();

    // Clean up
    return () => {
      console.log('Cleaning up enhanced auth subscription');
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    authCheckComplete,
    authError,
    storageAvailable,
    retryCount
  };
};
