
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
      
      // In this simplified implementation, we'll just return the organization owner
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, job_title')
          .eq('id', organizationId)
          .single();
          
        if (error) throw error;
        
        if (!profile) return [];
        
        // Create a single member representing the organization owner
        const member: OrganizationMember = {
          id: profile.id,
          user_id: profile.id,
          organization_id: profile.id,
          role: 'administrator',
          is_primary: true,
          created_at: new Date().toISOString()
        };
        
        return [member];
      } catch (error) {
        console.error('Error fetching organization members:', error);
        return [];
      }
    },
    enabled: !!organizationId
  });
  
  const sendInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      try {
        // Simplified invitation handling - in a real app you would store this in a database
        console.log(`Sending invitation to ${email} with role ${role}`);
        
        // Simulated success
        return { success: true, message: 'Invitation sent!' };
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
      // In a real application, we would remove the member from the database
      console.log(`Removing member ${memberId}`);
      
      // Simulated success
      return { success: true };
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
