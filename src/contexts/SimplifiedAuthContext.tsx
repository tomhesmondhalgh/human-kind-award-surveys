
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authCheckComplete: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  authCheckComplete: false,
  signIn: async () => ({ error: null, data: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const SimplifiedAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setSession(session);
        setUser(session?.user || null);
      } catch (error) {
        console.error('Unexpected error during session check:', error);
      } finally {
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    };

    getInitialSession();

    // Set up auth subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setAuthCheckComplete(true);
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Simplified sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      return response;
    } catch (error) {
      console.error('Error signing in:', error);
      return { error, data: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified sign up function
  const signUp = async (email: string, password: string, userData?: any) => {
    setIsLoading(true);
    try {
      // Simple sign up without role management
      const options = userData ? {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
      } : {};

      const response = await supabase.auth.signUp({
        email,
        password,
        options,
      });
      
      // If sign up was successful and we have user data, update the profile
      if (response.data?.user && userData) {
        try {
          // Fix: Ensure profile_id is the first parameter and all parameters are in the correct order
          await supabase.rpc('create_or_update_profile', {
            profile_id: response.data.user.id,
            profile_first_name: userData.firstName,
            profile_last_name: userData.lastName,
            profile_job_title: userData.jobTitle || '',
            profile_school_name: userData.schoolName || '',
            profile_school_address: userData.schoolAddress || ''
          });
        } catch (profileError) {
          console.error('Error updating profile in simplified context:', profileError);
          // Continue even if profile update fails
        }
      }

      return response;
    } catch (error) {
      console.error('Error signing up:', error);
      return { error, data: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        authCheckComplete,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

