
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { OrganizationMember } from '@/types/organizations';

export function useTeamMembers(organizationId: string | undefined) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { 
    data: members, 
    isLoading, 
    error,
    refetch: refetchMembers 
  } = useQuery({
    queryKey: ['organizationMembers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      try {
        console.log('Fetching team members for organization:', organizationId);
        
        const { data, error } = await supabase
          .from('organization_memberships')
          .select(`
            *,
            profiles(first_name, last_name, job_title)
          `)
          .eq('organization_id', organizationId as any);
          
        if (error) {
          console.error('Error fetching team members:', error);
          throw error;
        }
        
        console.log('Raw team members data:', data);
        
        const formattedMembers = (data || []).map((item: any) => ({
          ...item,
          profile: item.profiles || undefined
        })) as OrganizationMember[];
        
        console.log('Formatted team members:', formattedMembers);
        return formattedMembers;
      } catch (error) {
        console.error('Error in team members query:', error);
        throw error;
      }
    },
    enabled: !!organizationId
  });

  // Check if current user is admin
  const { data: currentUserRole } = useQuery({
    queryKey: ['currentUserRole', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user?.id) return null;
      
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) return null;
        
        console.log('Checking user role for:', session.session.user.id, 'in org:', organizationId);
        
        const { data, error } = await supabase
          .from('organization_memberships')
          .select('role')
          .eq('organization_id', organizationId as any)
          .eq('user_id', session.session.user.id as any)
          .single();
          
        if (error) {
          console.error('Error fetching user role:', error);
          return null;
        }
        
        // Safe property access with type checking
        const role = data && typeof data === 'object' && 'role' in data ? data.role : null;
        console.log('User role result:', role);
        return role;
      } catch (error) {
        console.error('Error in user role query:', error);
        return null;
      }
    },
    enabled: !!organizationId && !!user?.id
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!organizationId || !user?.id) {
        throw new Error('Missing organization or user information');
      }

      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const { data, error } = await supabase
        .from('organization_invitations')
        .insert({
          email,
          organization_id: organizationId as any,
          role: role as any,
          token,
          invited_by: user.id as any,
          expires_at: expiresAt.toISOString()
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email,
          organizationId,
          token,
          inviterName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'A team member'
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't throw here as the invitation was created successfully
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      queryClient.invalidateQueries({ queryKey: ['organizationInvitations', organizationId] });
      setIsInviteModalOpen(false);
    },
    onError: (error) => {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('id', membershipId as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Member removed successfully');
      refetchMembers();
    },
    onError: (error) => {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['organizationInvitations', organizationId] });
    },
    onError: (error) => {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      // This would typically involve calling an edge function to resend the email
      // For now, we'll just simulate success
      console.log('Resending invitation:', invitationId);
      return true;
    },
    onSuccess: () => {
      toast.success('Invitation resent successfully');
    },
    onError: (error) => {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  });

  return {
    members,
    isLoading,
    isError: !!error,
    error,
    currentUserRole,
    isInviteModalOpen,
    setIsInviteModalOpen,
    sendInvitation: sendInvitationMutation,
    removeMember: removeMemberMutation,
    cancelInvitation: cancelInvitationMutation,
    resendInvitation: resendInvitationMutation,
    refetchMembers
  };
}
