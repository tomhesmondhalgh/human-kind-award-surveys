
import React, { createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useAuthState } from '@/utils/auth/useAuthState';
import { signInWithEmail } from '@/utils/auth/signIn';
import { signUpWithEmail } from '@/utils/auth/signUp';
import { signOutUser } from '@/utils/auth/signOut';
import { completeUserProfile } from '@/utils/auth/profileManagement';
import { useEnhancedSession } from '@/hooks/useEnhancedSession';
import { withErrorRecovery } from '@/utils/auth/errorRecovery';
import { classifyError, getUserFriendlyMessage } from '@/utils/auth/errorClassification';
import { toast } from 'sonner';

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
  // Methods with enhanced error recovery
  signIn: (email: string, password: string) => Promise<{ error: any; success: boolean }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any; success: boolean; user?: User }>;
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

  // Enhanced sign in handler with error recovery and classification
  const signIn = withErrorRecovery(
    async (email: string, password: string) => {
      console.log('🔐 Enhanced sign in with error recovery');
      
      const result = await signInWithEmail(email, password);
      
      // If sign in fails, classify and handle the error
      if (!result.success && result.error) {
        const classifiedError = classifyError(result.error);
        const userMessage = getUserFriendlyMessage(classifiedError);
        
        // Show appropriate toast based on error classification
        if (classifiedError.isRecoverable) {
          toast.warning(userMessage, {
            description: classifiedError.suggestedActions[0],
            duration: 4000
          });
        } else {
          toast.error(userMessage, {
            description: classifiedError.suggestedActions[0],
            duration: 6000
          });
        }
        
        return {
          ...result,
          error: {
            ...result.error,
            classifiedError,
            userMessage
          }
        };
      }
      
      // After successful sign in, validate the session
      if (result.success) {
        setTimeout(() => {
          validateSession();
        }, 100);
        
        toast.success('Welcome back!', {
          description: 'You have been successfully logged in.',
          duration: 3000
        });
      }
      
      return result;
    },
    {
      maxRetries: 2,
      onProgress: (state) => {
        console.log('🔄 Sign in recovery progress:', state);
        if (state.attempts.length > 1) {
          toast.info('Retrying login...', {
            description: 'Attempting to resolve the connection issue.',
            duration: 3000
          });
        }
      },
      onFailure: (finalError) => {
        console.error('❌ Sign in recovery failed:', finalError);
        const userMessage = getUserFriendlyMessage(finalError);
        toast.error(userMessage, {
          description: 'Please try again or contact support if the issue persists.',
          duration: 8000
        });
      }
    }
  );

  // Enhanced sign up handler with error recovery
  const signUp = withErrorRecovery(
    async (email: string, password: string, userData?: any) => {
      console.log('📝 Enhanced sign up with error recovery');
      
      const response = await signUpWithEmail(email, password, userData);
      
      // Handle storage-related warnings
      if (storageCapabilities && !storageCapabilities.localStorage) {
        toast.warning('Limited browser storage detected', {
          description: 'Your session may not persist between browser sessions.',
          duration: 5000
        });
      }
      
      if (response.success) {
        toast.success('Account created successfully!', {
          description: 'Please check your email to verify your account.',
          duration: 5000
        });
      } else if (response.error) {
        const classifiedError = classifyError(response.error);
        const userMessage = getUserFriendlyMessage(classifiedError);
        
        toast.error(userMessage, {
          description: classifiedError.suggestedActions[0],
          duration: 6000
        });
      }
      
      return response;
    },
    {
      maxRetries: 1,
      onFailure: (finalError) => {
        console.error('❌ Sign up recovery failed:', finalError);
        const userMessage = getUserFriendlyMessage(finalError);
        toast.error(userMessage, {
          description: 'Please try again with different details or contact support.',
          duration: 8000
        });
      }
    }
  );

  // Enhanced sign out handler with error recovery and session cleanup
  const signOut = withErrorRecovery(
    async () => {
      console.log('🚪 Enhanced sign out with error recovery');
      
      try {
        // Force logout through session monitor for cross-tab coordination
        forceLogout();
        
        // Also perform traditional sign out
        await signOutUser();
        
        toast.success('Logged out successfully', {
          description: 'You have been safely logged out.',
          duration: 3000
        });
      } catch (error) {
        console.error('⚠️ Sign out error:', error);
        
        // Even if sign out fails, ensure cleanup via forceLogout
        forceLogout();
        
        // Classify and handle the error
        const classifiedError = classifyError(error as Error);
        
        if (classifiedError.isRecoverable) {
          toast.warning('Logout completed with issues', {
            description: 'You have been logged out, but some cleanup may be incomplete.',
            duration: 4000
          });
        } else {
          toast.error('Logout error', {
            description: 'Please refresh the page to complete logout.',
            duration: 5000
          });
        }
        
        throw error;
      }
    },
    {
      maxRetries: 1,
      onFailure: (finalError) => {
        console.error('❌ Sign out recovery failed:', finalError);
        // Force a page refresh as last resort
        window.location.reload();
      }
    }
  );

  // Enhanced profile completion handler
  const handleCompleteUserProfile = withErrorRecovery(
    async (userData: any) => {
      if (!user) {
        const error = new Error('User not authenticated');
        const classifiedError = classifyError(error);
        const userMessage = getUserFriendlyMessage(classifiedError);
        
        toast.error(userMessage, {
          description: 'Please log in first.',
          duration: 4000
        });
        
        return { error, success: false };
      }
      
      const result = await completeUserProfile(user.id, userData);
      
      if (result.success) {
        toast.success('Profile updated successfully!', {
          description: 'Your profile information has been saved.',
          duration: 3000
        });
      } else if (result.error) {
        const classifiedError = classifyError(result.error);
        const userMessage = getUserFriendlyMessage(classifiedError);
        
        toast.error(userMessage, {
          description: classifiedError.suggestedActions[0],
          duration: 5000
        });
      }
      
      return result;
    },
    {
      maxRetries: 2,
      onFailure: (finalError) => {
        console.error('❌ Profile completion recovery failed:', finalError);
        const userMessage = getUserFriendlyMessage(finalError);
        toast.error(userMessage, {
          description: 'Please try again or contact support.',
          duration: 6000
        });
      }
    }
  );

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
