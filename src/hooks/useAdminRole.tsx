import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Whether the signed-in user is a platform admin (user_roles). Cached for five
// minutes and shared by every component that asks.
export function useAdminRole() {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading, refetch } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin', { _user_id: user!.id });
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const refreshAdminStatus = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    isAdmin,
    isLoading: !!user && isLoading,
    refreshAdminStatus
  };
}
