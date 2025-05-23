
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationInvitation } from '@/types/organizations';

export function useTeamInvitations(organizationId: string | undefined) {
  const { 
    data: invitations, 
    isLoading: invitationsLoading, 
    error: invitationsError,
    refetch: refetchInvitations
  } = useQuery({
    queryKey: ['organizationInvitations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      try {
        const { data, error } = await supabase
          .from('organization_invitations')
          .select('*')
          .eq('organization_id', organizationId)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString());
          
        if (error) throw error;
        
        return data as OrganizationInvitation[];
      } catch (error) {
        console.error('Error fetching invitations:', error);
        return [];
      }
    },
    enabled: !!organizationId
  });

  return {
    invitations: invitations || [],
    invitationsLoading,
    invitationsError,
    refetchInvitations
  };
}
