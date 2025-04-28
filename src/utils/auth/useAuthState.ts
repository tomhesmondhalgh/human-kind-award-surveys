
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

  useEffect(() => {
    console.log('Auth state hook initializing');
    let mounted = true;

    // Add a timeout to ensure we don't get stuck in loading state
    const timeoutId = setTimeout(() => {
      if (isLoading && mounted) {
        console.warn('Auth initialization timed out after 5 seconds');
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    }, 5000);

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event);
      
      // Update state with new session data
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      setAuthCheckComplete(true);
    });

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          if (mounted) {
            setIsLoading(false);
            setAuthCheckComplete(true);
          }
          return;
        }
        
        if (mounted) {
          console.log('Initial session retrieved:', data.session ? 'Session exists' : 'No session');
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setIsLoading(false);
          setAuthCheckComplete(true);
        }
      } catch (error) {
        console.error('Exception getting initial session:', error);
        if (mounted) {
          setIsLoading(false);
          setAuthCheckComplete(true);
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
    authCheckComplete
  };
};
