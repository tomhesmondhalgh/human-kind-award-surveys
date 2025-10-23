
import React, { createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useAuthState } from '@/utils/auth/useAuthState';
import { signInWithEmail } from '@/utils/auth/signIn';
import { signUpWithEmail } from '@/utils/auth/signUp';
import { signOutUser } from '@/utils/auth/signOut';
import { completeUserProfile } from '@/utils/auth/profileManagement';
import { useEnhancedSession } from '@/hooks/useEnhancedSession';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authCheckComplete: boolean;
  authError: Error | null;
  storageCapabilities: any;
  // Enhanced session properties
  isSessionHealthy: boolean;
  sessionHealthIssues: string[];
  lastSessionRefresh: Date | null;
  // Methods
  signIn: (email: string, password: string) => Promise<{ error: any; success: boolean }>;
  signUp: (email: string, password: string, userData?: any, skipOrgCreation?: boolean) => Promise<{ error: any; success: boolean; user?: User }>;
  signOut: () => Promise<void>;
  completeUserProfile: (userData: any) => Promise<{ error: any; success: boolean }>;
  // Enhanced session methods
  refreshSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  forceLogout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  authCheckComplete: false,
  authError: null,
  storageCapabilities: null,
  isSessionHealthy: true,
  sessionHealthIssues: [],
  lastSessionRefresh: null,
  signIn: async () => ({ error: null, success: false }),
  signUp: async () => ({ error: null, success: false }),
  signOut: async () => {},
  completeUserProfile: async () => ({ error: null, success: false }),
  refreshSession: async () => {},
  validateSession: async () => false,
  forceLogout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the original auth state hook for backwards compatibility
  const { user, session, isLoading, isAuthenticated, authCheckComplete, authError, storageCapabilities } = useAuthState();

  // Use enhanced session management for additional capabilities
  const {
    isHealthy: isSessionHealthy,
    healthIssues: sessionHealthIssues,
    lastRefresh: lastSessionRefresh,
    refreshSession,
    validateSession,
    forceLogout
  } = useEnhancedSession();

  // Enhanced sign in handler with session monitoring integration
  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmail(email, password);
      
      // If sign in fails due to storage issues, provide helpful guidance
      if (!result.success && authError?.message.includes('storage')) {
        return {
          ...result,
          error: {
            ...result.error,
            message: result.error.message + ' Try adjusting your browser privacy settings to allow storage for this site.'
          }
        };
      }
      
      // After successful sign in, validate the session
      if (result.success) {
        setTimeout(() => {
          validateSession();
        }, 100);
      }
      
      return result;
    } catch (error) {
      console.error('Enhanced sign in error:', error);
      return { error: error as Error, success: false };
    }
  };

  // Enhanced sign up handler
  const signUp = async (email: string, password: string, userData?: any, skipOrgCreation?: boolean) => {
    try {
      const response = await signUpWithEmail(email, password, userData, skipOrgCreation);
      
      // Provide storage-aware guidance
      if (storageCapabilities && !storageCapabilities.localStorage) {
        console.warn('⚠️ localStorage not available - session may not persist');
      }
      
      return response;
    } catch (error) {
      console.error('Enhanced sign up error:', error);
      return { error: error as Error, success: false };
    }
  };

  // Enhanced sign out handler with session cleanup
  const signOut = async () => {
    try {
      // Force logout through session monitor for cross-tab coordination
      forceLogout();
      
      // Also perform traditional sign out
      await signOutUser();
    } catch (error) {
      console.error('Enhanced sign out error:', error);
      // Even if sign out fails, ensure cleanup via forceLogout
      forceLogout();
    }
  };

  // Profile completion handler
  const handleCompleteUserProfile = async (userData: any) => {
    if (!user) {
      return { error: new Error('User not authenticated'), success: false };
    }
    
    return completeUserProfile(user.id, userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        authCheckComplete,
        authError,
        storageCapabilities,
        isSessionHealthy,
        sessionHealthIssues,
        lastSessionRefresh,
        signIn,
        signUp,
        signOut,
        completeUserProfile: handleCompleteUserProfile,
        refreshSession,
        validateSession,
        forceLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
