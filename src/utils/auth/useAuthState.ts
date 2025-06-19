
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for managing authentication state
 * This is the core hook that tracks user authentication state
 * and provides consistent session management
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('Auth state hook initializing - clean version');
    let mounted = true;

    // Add a timeout to ensure we don't get stuck in loading state
    const timeoutId = setTimeout(() => {
      if (isLoading && mounted) {
        console.warn('Auth initialization timed out after 10 seconds');
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    }, 10000); // Increased timeout

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, newSession ? 'Session exists' : 'No session');
      
      // Update state with new session data
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      setAuthCheckComplete(true);
      
      // Log detailed session info for debugging
      if (newSession) {
        console.log('Session details:', {
          userId: newSession.user.id,
          email: newSession.user.email,
          expiresAt: new Date(newSession.expires_at! * 1000).toISOString(),
          accessToken: newSession.access_token ? 'Present' : 'Missing'
        });
        
        // Test if we can make a simple authenticated request
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            console.error('Session validation failed:', error);
          } else {
            console.log('Session validated successfully');
          }
        } catch (testError) {
          console.error('Failed to test session:', testError);
        }
      }
    });

    // Get initial session with retry mechanism
    const initializeAuth = async () => {
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && mounted) {
        try {
          console.log(`Attempting to get initial session (attempt ${retryCount + 1})`);
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error(`Session retrieval error (attempt ${retryCount + 1}):`, error);
            if (retryCount === maxRetries - 1) {
              setAuthError(error);
              if (mounted) {
                setIsLoading(false);
                setAuthCheckComplete(true);
              }
              return;
            }
          } else {
            if (mounted) {
              console.log('Initial session retrieved:', 
                data.session ? `Session exists (user: ${data.session.user.email})` : 'No session');
              setSession(data.session);
              setUser(data.session?.user ?? null);
              setIsLoading(false);
              setAuthCheckComplete(true);
              
              // Log session details for debugging
              if (data.session) {
                const expiresAt = new Date(data.session.expires_at! * 1000).toISOString();
                const now = new Date().toISOString();
                console.log(`Session expires at ${expiresAt} (now: ${now})`);
                const isExpired = data.session.expires_at! * 1000 < Date.now();
                console.log(`Is session expired? ${isExpired}`);
              }
            }
            return; // Success, exit retry loop
          }
        } catch (error) {
          console.error(`Exception getting initial session (attempt ${retryCount + 1}):`, error);
          if (retryCount === maxRetries - 1) {
            setAuthError(error as Error);
            if (mounted) {
              setIsLoading(false);
              setAuthCheckComplete(true);
            }
          }
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    };
    
    initializeAuth();

    // Clean up
    return () => {
      console.log('Cleaning up auth subscription');
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
    authError
  };
};
