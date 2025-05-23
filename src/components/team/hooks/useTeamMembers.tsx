
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrganizationMember } from '@/types/organizations';

export function useTeamMembers(organizationId?: string) {
  const queryClient = useQueryClient();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  const {
    data: members,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['organizationMembers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      try {
        const { data, error } = await supabase
          .from('organization_memberships')
          .select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              job_title
            )
          `)
          .eq('organization_id', organizationId);
          
        if (error) throw error;
        
        return (data || []).map(membership => ({
          ...membership,
          profile: membership.profiles
        })) as OrganizationMember[];
      } catch (error) {
        console.error('Error fetching organization members:', error);
        throw error;
      }
    },
    enabled: !!organizationId
  });
  
  const sendInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      try {
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
        
        const { data, error } = await supabase
          .from('organization_invitations')
          .insert({
            email,
            organization_id: organizationId,
            role: role as any,
            token,
            invited_by: (await supabase.auth.getUser()).data.user?.id,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();
          
        if (error) throw error;
        
        // TODO: Send invitation email via edge function
        console.log('Invitation created:', data);
        
        return data;
      } catch (error) {
        console.error('Error sending invitation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      setIsInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] });
    },
    onError: () => {
      toast.error('Failed to send invitation');
    }
  });
  
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Team member removed');
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] });
    },
    onError: () => {
      toast.error('Failed to remove team member');
    }
  });
  
  return {
    members,
    isLoading,
    isError,
    error,
    refetch,
    isInviteModalOpen,
    setIsInviteModalOpen,
    sendInvitation,
    removeMember
  };
}
