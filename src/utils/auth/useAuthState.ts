
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from './sessionUtils';

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
    console.log('🔐 Auth state hook initializing');
    let mounted = true;

    // Add a timeout to ensure we don't get stuck in loading state
    const timeoutId = setTimeout(() => {
      if (isLoading && mounted) {
        console.warn('⚠️ Auth initialization timed out after 5 seconds');
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    }, 5000);

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event);
      console.log('📊 Session details:', {
        hasSession: !!newSession,
        userId: newSession?.user?.id,
        email: newSession?.user?.email,
        expiresAt: newSession?.expires_at ? new Date(newSession.expires_at * 1000) : null,
        accessToken: newSession?.access_token ? `${newSession.access_token.substring(0, 20)}...` : null
      });
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in successfully');
          break;
        case 'SIGNED_OUT':
          console.log('🚪 User signed out');
          // Clean up any remaining auth state
          cleanupAuthState();
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

    // Get initial session with enhanced debugging
    const initializeAuth = async () => {
      try {
        console.log('🚀 Attempting to get initial session...');
        
        // First, check what's in localStorage
        const storageKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-')
        );
        console.log('🗄️ Auth-related localStorage keys:', storageKeys);
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          setAuthError(error);
          if (mounted) {
            setIsLoading(false);
            setAuthCheckComplete(true);
          }
          return;
        }
        
        if (mounted) {
          const sessionExists = !!data.session;
          console.log('📋 Initial session retrieved:', 
            sessionExists 
              ? `✅ Session exists (user: ${data.session!.user.email})` 
              : '❌ No session found'
          );
          
          if (data.session) {
            const expiresAt = new Date(data.session.expires_at! * 1000);
            const now = new Date();
            const isExpired = expiresAt <= now;
            const timeToExpiry = expiresAt.getTime() - now.getTime();
            
            console.log('⏰ Session timing:', {
              expiresAt: expiresAt.toISOString(),
              now: now.toISOString(),
              isExpired,
              timeToExpiryMinutes: Math.round(timeToExpiry / (1000 * 60))
            });
            
            if (isExpired) {
              console.warn('⚠️ Session appears to be expired');
              // Try to refresh the session
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.error('❌ Failed to refresh expired session:', refreshError);
                // Clean up and force re-authentication
                cleanupAuthState();
                setSession(null);
                setUser(null);
              } else {
                console.log('✅ Session refreshed successfully');
                setSession(refreshData.session);
                setUser(refreshData.session?.user ?? null);
              }
            } else {
              setSession(data.session);
              setUser(data.session.user);
            }
          } else {
            setSession(null);
            setUser(null);
          }
          
          setIsLoading(false);
          setAuthCheckComplete(true);
        }
      } catch (error) {
        console.error('💥 Exception getting initial session:', error);
        setAuthError(error as Error);
        if (mounted) {
          setIsLoading(false);
          setAuthCheckComplete(true);
        }
      }
    };
    
    initializeAuth();

    // Clean up
    return () => {
      console.log('🧹 Cleaning up auth subscription');
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Log current auth state for debugging
  useEffect(() => {
    console.log('📊 Current auth state:', {
      isAuthenticated: !!user && !!session,
      isLoading,
      authCheckComplete,
      userId: user?.id,
      userEmail: user?.email,
      hasError: !!authError
    });
  }, [user, session, isLoading, authCheckComplete, authError]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    authCheckComplete,
    authError
  };
};
