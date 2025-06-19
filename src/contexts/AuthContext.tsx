
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useAuthState } from '../utils/auth/useAuthState';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, authError: stateError } = useAuthState();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (stateError) {
      setAuthError(stateError.message);
    } else {
      setAuthError(null);
    }
  }, [stateError]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        setAuthError(error.message);
      }
    } catch (error: any) {
      console.error('Unexpected error signing out:', error);
      setAuthError(error.message || 'An unexpected error occurred');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
