
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
      if (!organizationId) {
        console.log('📋 No organizationId provided to useTeamInvitations');
        return [];
      }
      
      console.log('📋 Fetching invitations for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('❌ Error fetching invitations:', error);
        throw error; // Let React Query handle the error
      }
      
      console.log('✅ Fetched invitations:', data?.length || 0);
      return data as OrganizationInvitation[];
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
