
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrganizationMember } from '@/types/organizations';
import { ensureValidSession } from '@/utils/auth/sessionValidator';
import { sendTeamInvitation } from '@/utils/team/invitationUtils';

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
        console.log('🔍 Starting team members query with enhanced session validation');
        
        // Enhanced session validation
        const session = await ensureValidSession();
        console.log('✅ Valid session confirmed for team members query');

        const { data, error } = await supabase
          .from('organization_memberships')
          .select(`
            *,
            profiles!fk_organization_memberships_user_id (
              first_name,
              last_name,
              job_title
            )
          `)
          .eq('organization_id', organizationId);
          
        if (error) {
          console.error('❌ Team members query error:', error);
          throw error;
        }
        
        console.log('✅ Team members fetched successfully:', data?.length || 0, 'members');
        
        return (data || []).map(membership => ({
          ...membership,
          profile: membership.profiles
        })) as OrganizationMember[];
      } catch (error) {
        console.error('💥 Error fetching organization members:', error);
        throw error;
      }
    },
    enabled: !!organizationId,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('Authentication required') || error?.message?.includes('Unable to establish valid session')) {
        return false;
      }
      // Don't retry PostgREST syntax errors
      if (error?.message?.includes('syntax error') || (error as any)?.code === 'PGRST116') {
        return false;
      }
      return failureCount < 2;
    }
  });
  
  const sendInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await sendTeamInvitation({
        email,
        role,
        organizationId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Invitation failed');
      }
      
      return result.invitation;
    },
    onSuccess: () => {
      console.log('🎉 Invitation process completed successfully');
      toast.success('Invitation sent successfully');
      setIsInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizationInvitations', organizationId] });
    },
    onError: (error: any) => {
      console.error('❌ Invitation mutation error:', error);
      
      let errorMessage = 'Failed to send invitation';
      
      if (error.message?.includes('Authentication required')) {
        errorMessage = 'Authentication required - please refresh the page and log in again';
      } else if (error.message?.includes('permission denied') || error.message?.includes('admin permissions')) {
        errorMessage = 'You do not have permission to invite members to this organisation';
      } else if (error.message?.includes('Database permission denied')) {
        errorMessage = 'Database access issue - please refresh the page and try again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      console.log('🔄 Resending invitation:', invitationId);
      
      // Enhanced session validation
      const session = await ensureValidSession();
      console.log('✅ Valid session confirmed for resend invitation');

      // Get the invitation details
      const { data: invitation, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations!organization_invitations_organization_id_fkey (name)
        `)
        .eq('id', invitationId)
        .single();

      if (error) {
        console.error('❌ Error fetching invitation for resend:', error);
        throw new Error(`Failed to fetch invitation: ${error.message}`);
      }

      // Get inviter profile separately
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', invitation.invited_by)
        .single();

      const inviterName = inviterProfile 
        ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague'
        : 'A colleague';

      // Send the invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: invitation.email,
          organizationName: invitation.organizations?.name || 'your organization',
          role: invitation.role,
          inviterName,
          invitationToken: invitation.token
        }
      });

      if (emailError) {
        console.error('❌ Error resending invitation email:', emailError);
        throw new Error(`Failed to resend email: ${emailError.message}`);
      }
      
      console.log('✅ Invitation resent successfully');
      return invitation;
    },
    onSuccess: () => {
      toast.success('Invitation email resent successfully');
    },
    onError: (error: any) => {
      console.error('❌ Resend invitation error:', error);
      
      let errorMessage = 'Failed to resend invitation';
      if (error.message?.includes('Authentication required') || error.message?.includes('Unable to establish valid session')) {
        errorMessage = 'Authentication required - please refresh the page and log in again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  });
  
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      console.log('🗑️ Removing member:', memberId);
      
      // Enhanced session validation
      const session = await ensureValidSession();
      console.log('✅ Valid session confirmed for remove member');

      const { error } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('id', memberId);
        
      if (error) {
        console.error('❌ Error removing member:', error);
        throw new Error(`Failed to remove member: ${error.message}`);
      }
      
      console.log('✅ Member removed successfully');
    },
    onSuccess: () => {
      toast.success('Team member removed');
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] });
    },
    onError: (error: any) => {
      console.error('❌ Remove member error:', error);
      
      let errorMessage = 'Failed to remove team member';
      if (error.message?.includes('Authentication required') || error.message?.includes('Unable to establish valid session')) {
        errorMessage = 'Authentication required - please refresh the page and log in again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
    removeMember,
    resendInvitation
  };
}
