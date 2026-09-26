import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * The signed-in user and session. supabase-js stores the session, refreshes the
 * token before it expires (autoRefreshToken) and tells other tabs about
 * sign-ins and sign-outs, so this hook only mirrors its state into React.
 */
export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const apply = (newSession: Session | null) => {
      if (!mounted) return;
      setSession(newSession);
      // Hourly token refreshes produce a new user object for the same person;
      // keep the old one so effects that depend on `user` don't re-run.
      setUser((current) => {
        const next = newSession?.user ?? null;
        if (current && next && current.id === next.id && current.updated_at === next.updated_at) {
          return current;
        }
        return next;
      });
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      apply(newSession);
    });

    supabase.auth.getSession()
      .then(({ data }) => apply(data.session))
      .catch((error) => {
        console.error('Could not read the saved session:', error);
        apply(null);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    authCheckComplete: !isLoading,
  };
};
