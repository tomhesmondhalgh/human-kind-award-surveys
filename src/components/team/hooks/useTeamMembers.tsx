
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
        console.log('🚀 Starting invitation process...', { email, role, organizationId });

        // Check session before making the request
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw new Error(`Session error: ${sessionError.message}`);
        }
        
        if (!session?.user) {
          console.error('❌ No authenticated session');
          throw new Error('Not authenticated - please log in again');
        }

        console.log('✅ Session validated, user:', session.user.id);

        // Generate invitation token and expiry
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
        
        console.log('📝 Creating invitation in database...', {
          email,
          organizationId,
          role,
          invitedBy: session.user.id,
          token: token.substring(0, 8) + '...',
          expiresAt: expiresAt.toISOString()
        });

        // Create the invitation in the database
        const { data: invitation, error: dbError } = await supabase
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
          
        if (dbError) {
          console.error('❌ Database invitation creation error:', {
            error: dbError,
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            code: dbError.code
          });
          
          // Provide specific error messages based on the error type
          if (dbError.message?.includes('permission denied')) {
            throw new Error('Permission denied - you may not have admin rights for this organisation');
          } else if (dbError.message?.includes('violates row-level security')) {
            throw new Error('Access denied - please check your organisation permissions');
          } else if (dbError.message?.includes('duplicate key')) {
            throw new Error('An invitation for this email already exists');
          } else {
            throw new Error(`Database error: ${dbError.message}`);
          }
        }
        
        console.log('✅ Invitation created in database:', invitation?.id);

        // Get inviter profile for email
        const { data: inviterProfile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.warn('⚠️ Could not fetch inviter profile:', profileError);
        }

        const inviterName = inviterProfile 
          ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague'
          : 'A colleague';

        console.log('📧 Sending invitation email...', {
          to: email,
          organizationName: invitation.organizations?.name || 'your organization',
          inviterName
        });

        // Send the invitation email
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-team-invitation', {
          body: {
            email,
            organizationName: invitation.organizations?.name || 'your organization',
            role,
            inviterName,
            invitationToken: token
          }
        });

        if (emailError) {
          console.error('❌ Email sending error:', emailError);
          // Don't throw here - the invitation was created successfully, just log the email error
          toast.error('Invitation created but email failed to send. You can resend it from the pending invitations list.');
          return invitation;
        } else {
          console.log('✅ Invitation email sent successfully:', emailData);
        }
        
        return invitation;
      } catch (error) {
        console.error('❌ Error in sendInvitation:', error);
        throw error;
      }
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
      
      if (error.message?.includes('Not authenticated')) {
        errorMessage = 'Authentication required - please refresh the page and log in again';
      } else if (error.message?.includes('Permission denied')) {
        errorMessage = 'You do not have permission to invite members to this organisation';
      } else if (error.message?.includes('Access denied')) {
        errorMessage = 'Access denied - please check your organisation permissions';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      console.log('🔄 Resending invitation:', invitationId);
      
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
      if (error.message?.includes('Not authenticated')) {
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
      
      // Check session before making the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

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
      if (error.message?.includes('Not authenticated')) {
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
