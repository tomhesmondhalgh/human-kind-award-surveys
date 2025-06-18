
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrganizationMember } from '@/types/organizations';
import { preflightAuthCheck, requireAuthentication } from '@/utils/auth/sessionUtils';

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
        // Enhanced auth check before querying
        const authCheck = await preflightAuthCheck('fetch team members');
        
        if (!authCheck.success) {
          console.error('Pre-flight auth check failed:', authCheck.error);
          
          if (authCheck.storageIssues) {
            throw new Error('Browser privacy settings are blocking authentication. Please try refreshing the page or using a different browser.');
          }
          
          if (authCheck.needsRefresh) {
            throw new Error('Authentication session expired. Please refresh the page and log in again.');
          }
          
          throw authCheck.error || new Error('Authentication required');
        }

        console.log('Team members query - Auth check passed:', {
          hasSession: !!authCheck.session,
          userId: authCheck.session?.user?.id,
          organizationId
        });

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
          
          // Enhanced error handling for common issues
          if (error.code === '42501') {
            throw new Error('Permission denied. You may not have access to view this organisation\'s team members.');
          } else if (error.message?.includes('JWT')) {
            throw new Error('Authentication token invalid. Please refresh the page and log in again.');
          }
          
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
      if (error?.message?.includes('Authentication') || 
          error?.message?.includes('Permission denied') ||
          error?.message?.includes('privacy settings')) {
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
      
      try {
        // Enhanced pre-flight auth check
        const authCheck = await preflightAuthCheck('send team invitation');
        
        if (!authCheck.success) {
          console.error('Pre-flight auth check failed for invitation:', authCheck.error);
          
          if (authCheck.storageIssues) {
            throw new Error('Browser privacy settings are preventing invitations. Please try refreshing the page or contact support.');
          }
          
          if (authCheck.needsRefresh) {
            throw new Error('Your session has expired. Please refresh the page and log in again to send invitations.');
          }
          
          throw new Error('Authentication required to send invitations');
        }

        console.log('Sending invitation with enhanced auth check:', { 
          email, 
          role, 
          organizationId, 
          userId: authCheck.session.user.id 
        });

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
            invited_by: authCheck.session.user.id,
            expires_at: expiresAt.toISOString()
          })
          .select(`
            *,
            organizations!organization_invitations_organization_id_fkey (name)
          `)
          .single();
          
        if (error) {
          console.error('Invitation creation error:', error);
          
          // Enhanced error messages with retry suggestions
          if (error.code === '42501') {
            throw new Error('Permission denied: You may not have admin privileges for this organisation. Please refresh the page and try again.');
          } else if (error.code === '23505') {
            throw new Error('An invitation for this email already exists');
          } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
            throw new Error('Authentication error: Please refresh the page and log in again');
          } else {
            throw new Error(`Failed to create invitation: ${error.message}`);
          }
        }
        
        console.log('Invitation created successfully:', invitation);

        // Get inviter profile separately with error handling
        let inviterName = 'A colleague';
        try {
          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', authCheck.session.user.id)
            .single();

          if (inviterProfile) {
            inviterName = `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague';
          }
        } catch (profileError) {
          console.warn('Could not fetch inviter profile, using default name:', profileError);
        }

        // Send the invitation email with enhanced error handling
        try {
          const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
            body: {
              email,
              organizationName: invitation.organizations?.name || 'your organisation',
              role,
              inviterName,
              invitationToken: token
            }
          });

          if (emailError) {
            console.error('Email sending error:', emailError);
            // Don't throw here - the invitation was created successfully
            toast.error('Invitation created but email failed to send. You can resend it from the pending invitations list.');
          } else {
            console.log('Invitation email sent successfully');
          }
        } catch (emailException) {
          console.error('Email sending exception:', emailException);
          toast.error('Invitation created but email failed to send. You can resend it from the pending invitations list.');
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
      
      // Enhanced error handling with specific messages
      if (error.message?.includes('privacy settings')) {
        toast.error('Browser privacy settings are blocking invitations. Please try refreshing the page or contact support for assistance.');
      } else if (error.message?.includes('session expired') || error.message?.includes('Authentication')) {
        toast.error('Your session has expired. Please refresh the page and log in again.');
      } else if (error.message?.includes('Permission denied')) {
        toast.error('You need admin privileges to send invitations');
      } else {
        toast.error(error.message || 'Failed to send invitation');
      }
    }
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      // Enhanced auth check before resending
      const authCheck = await preflightAuthCheck('resend team invitation');
      
      if (!authCheck.success) {
        if (authCheck.storageIssues) {
          throw new Error('Browser privacy settings are preventing this action. Please refresh the page and try again.');
        }
        throw new Error('Authentication required - please refresh the page and log in again');
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

      // Get inviter profile separately with error handling
      let inviterName = 'A colleague';
      try {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', invitation.invited_by)
          .single();

        if (inviterProfile) {
          inviterName = `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague';
        }
      } catch (profileError) {
        console.warn('Could not fetch inviter profile for resend, using default name:', profileError);
      }

      // Send the invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: invitation.email,
          organizationName: invitation.organizations?.name || 'your organisation',
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
      if (error.message?.includes('privacy settings')) {
        toast.error('Browser privacy settings are blocking this action. Please refresh the page and try again.');
      } else if (error.message?.includes('Authentication')) {
        toast.error('Authentication required - please refresh the page and log in again');
      } else {
        toast.error('Failed to resend invitation');
      }
    }
  });
  
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      // Enhanced auth check before removing member
      const authCheck = await preflightAuthCheck('remove team member');
      
      if (!authCheck.success) {
        if (authCheck.storageIssues) {
          throw new Error('Browser privacy settings are preventing this action. Please refresh the page and try again.');
        }
        throw new Error('Authentication required - please refresh the page and log in again');
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
      if (error.message?.includes('privacy settings')) {
        toast.error('Browser privacy settings are blocking this action. Please refresh the page and try again.');
      } else if (error.message?.includes('Authentication')) {
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
