
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
        // Debug: Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Team members query - Session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          organizationId,
          sessionError
        });

        if (!session?.user) {
          console.warn('No authenticated session found when querying team members');
          throw new Error('Not authenticated');
        }

        // Updated query to work with the new foreign key constraints
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
          console.error('Team members query error:', error);
          throw error;
        }
        
        console.log('Team members fetched successfully:', data?.length || 0, 'members');
        
        return (data || []).map(membership => ({
          ...membership,
          profile: membership.profiles
        })) as OrganizationMember[];
      } catch (error) {
        console.error('Error fetching organization members:', error);
        throw error;
      }
    },
    enabled: !!organizationId,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('Not authenticated')) {
        return false;
      }
      // Don't retry PostgREST syntax errors - properly check for code property
      if (error?.message?.includes('syntax error') || (error as any)?.code === 'PGRST116') {
        return false;
      }
      return failureCount < 2;
    }
  });
  
  const sendInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      try {
        // Check session before making the request
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('Not authenticated - please log in again');
        }

        console.log('Sending invitation:', { email, role, organizationId, userId: session.user.id });

        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
        
        // Create the invitation in the database
        const { data: invitation, error } = await supabase
          .from('organization_invitations')
          .insert({
            email,
            organization_id: organizationId,
            role: role as any,
            token,
            invited_by: session.user.id,
            expires_at: expiresAt.toISOString()
          })
          .select(`
            *,
            organizations!organization_invitations_organization_id_fkey (name)
          `)
          .single();
          
        if (error) {
          console.error('Invitation creation error:', error);
          
          // Provide more specific error messages
          if (error.code === '42501') {
            throw new Error('Permission denied: You may not have admin privileges for this organization');
          } else if (error.code === '23505') {
            throw new Error('An invitation for this email already exists');
          } else {
            throw new Error(`Failed to create invitation: ${error.message}`);
          }
        }
        
        console.log('Invitation created successfully:', invitation);

        // Get inviter profile separately
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();

        // Send the invitation email
        const inviterName = inviterProfile 
          ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague'
          : 'A colleague';

        const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
          body: {
            email,
            organizationName: invitation.organizations?.name || 'your organization',
            role,
            inviterName,
            invitationToken: token
          }
        });

        if (emailError) {
          console.error('Email sending error:', emailError);
          // Don't throw here - the invitation was created successfully, just log the email error
          toast.error('Invitation created but email failed to send. You can resend it from the pending invitations list.');
        } else {
          console.log('Invitation email sent successfully');
        }
        
        return invitation;
      } catch (error) {
        console.error('Error sending invitation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      setIsInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizationInvitations', organizationId] });
    },
    onError: (error: any) => {
      console.error('Invitation mutation error:', error);
      if (error.message?.includes('Not authenticated')) {
        toast.error('Authentication required - please refresh the page and log in again');
      } else if (error.message?.includes('Permission denied')) {
        toast.error('You need admin privileges to send invitations');
      } else {
        toast.error(error.message || 'Failed to send invitation');
      }
    }
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      // Check session before making the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

      // Get the invitation details
      const { data: invitation, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations!organization_invitations_organization_id_fkey (name)
        `)
        .eq('id', invitationId)
        .single();

      if (error) throw error;

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

      if (emailError) throw emailError;
      
      return invitation;
    },
    onSuccess: () => {
      toast.success('Invitation email resent successfully');
    },
    onError: (error: any) => {
      console.error('Resend invitation error:', error);
      if (error.message?.includes('Not authenticated')) {
        toast.error('Authentication required - please refresh the page and log in again');
      } else {
        toast.error('Failed to resend invitation');
      }
    }
  });
  
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      // Check session before making the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

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
    onError: (error: any) => {
      console.error('Remove member error:', error);
      if (error.message?.includes('Not authenticated')) {
        toast.error('Authentication required - please refresh the page and log in again');
      } else {
        toast.error('Failed to remove team member');
      }
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
