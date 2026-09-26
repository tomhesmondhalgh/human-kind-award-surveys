import React, { createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useAuthState } from '@/utils/auth/useAuthState';
import { signInWithEmail } from '@/utils/auth/signIn';
import { signUpWithEmail } from '@/utils/auth/signUp';
import { signOutUser } from '@/utils/auth/signOut';
import { completeUserProfile } from '@/utils/auth/profileManagement';
import type { AuthResult, UserProfileData } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authCheckComplete: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, userData?: UserProfileData, skipOrgCreation?: boolean, invitationToken?: string) => Promise<AuthResult & { user?: User }>;
  signOut: () => Promise<void>;
  completeUserProfile: (userData: UserProfileData) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  authCheckComplete: false,
  signIn: async () => ({ error: null, success: false }),
  signUp: async () => ({ error: null, success: false }),
  signOut: async () => {},
  completeUserProfile: async () => ({ error: null, success: false }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session, isLoading, isAuthenticated, authCheckComplete } = useAuthState();

  const handleCompleteUserProfile = async (userData: UserProfileData): Promise<AuthResult> => {
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
        signIn: signInWithEmail,
        signUp: signUpWithEmail,
        signOut: signOutUser,
        completeUserProfile: handleCompleteUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
