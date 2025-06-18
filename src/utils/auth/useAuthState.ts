
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
    console.log('Auth state hook initializing');
    let mounted = true;
    let initializationStarted = false;

    // Clear any potential auth errors on mount
    setAuthError(null);

    // Add a timeout to ensure we don't get stuck in loading state
    const timeoutId = setTimeout(() => {
      if (isLoading && mounted) {
        console.warn('Auth initialization timed out after 3 seconds, completing with current state');
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    }, 3000); // Reduced from 5 seconds

    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, newSession ? 'has session' : 'no session');
      
      // Update state with new session data
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Only set loading to false if initialization has started
      if (initializationStarted) {
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    });

    // Get initial session
    const initializeAuth = async () => {
      if (!mounted) return;
      
      initializationStarted = true;
      
      try {
        console.log('Getting initial session...');
        
        // First try to get the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
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
          
          // Clear any previous errors on successful session retrieval
          setAuthError(null);
          
          // Log session details for debugging
          if (data.session) {
            const expiresAt = new Date(data.session.expires_at! * 1000).toISOString();
            const now = new Date().toISOString();
            console.log(`Session expires at ${expiresAt} (now: ${now})`);
            const isExpired = data.session.expires_at! * 1000 < Date.now();
            console.log(`Is session expired? ${isExpired}`);
            
            // If session is expired or expiring soon, try to refresh
            if (isExpired || (data.session.expires_at! * 1000 - Date.now()) < 60000) {
              console.log('Session expired or expiring soon, attempting refresh...');
              try {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                  console.error('Session refresh failed:', refreshError);
                } else if (refreshData.session) {
                  console.log('Session refreshed successfully');
                  setSession(refreshData.session);
                  setUser(refreshData.session.user);
                }
              } catch (refreshErr) {
                console.error('Exception during session refresh:', refreshErr);
              }
            }
          }
        }
      } catch (error) {
        console.error('Exception getting initial session:', error);
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
