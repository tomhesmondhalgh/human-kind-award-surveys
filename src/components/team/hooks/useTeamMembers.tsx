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
        console.log('🔍 Phase 1: Starting team members query with authentication verification');
        
        // Phase 1: Authentication State Verification
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('✅ Phase 1 - Session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          organizationId,
          sessionError,
          authUid: session?.user?.id
        });

        if (!session?.user) {
          console.error('❌ Phase 1 FAILED: No authenticated session found');
          throw new Error('Not authenticated - session validation failed');
        }

        console.log('✅ Phase 1 PASSED: Valid session found, proceeding to data query');

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
        console.log('🚀 === TEAM INVITATION DEBUG FLOW START ===');
        console.log('📋 Invitation request:', { email, role, organizationId });

        // PHASE 1: Authentication State Verification
        console.log('🔍 PHASE 1: Authentication State Verification');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('📊 Phase 1 - Session Analysis:', {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          sessionError: sessionError?.message,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null,
          isExpired: session?.expires_at ? (session.expires_at * 1000) < Date.now() : true
        });
        
        if (sessionError) {
          console.error('❌ Phase 1 FAILED: Session error:', sessionError);
          throw new Error(`Authentication error: ${sessionError.message}`);
        }
        
        if (!session?.user) {
          console.error('❌ Phase 1 FAILED: No authenticated session');
          throw new Error('Not authenticated - please log in again and try from /team page');
        }

        console.log('✅ Phase 1 PASSED: Valid session found');

        // PHASE 2: Database Function Testing
        console.log('🔍 PHASE 2: Database Permission Testing');
        
        try {
          // Test auth.uid() function
          const { data: currentUserEmail, error: emailError } = await supabase
            .rpc('get_current_user_email');
          
          console.log('📧 Auth UID Test Result:', {
            currentUserEmail,
            emailError: emailError?.message,
            expectedEmail: session.user.email,
            matches: currentUserEmail === session.user.email
          });

          if (emailError) {
            console.error('❌ Phase 2 FAILED: auth.uid() function error:', emailError);
            throw new Error(`Database authentication error: ${emailError.message}`);
          }

          // Test organization membership permission
          const { data: canManage, error: permissionError } = await supabase
            .rpc('user_can_manage_org_membership', {
              user_uuid: session.user.id,
              org_id: organizationId
            });

          console.log('🏢 Organization Permission Test:', {
            canManage,
            permissionError: permissionError?.message,
            userId: session.user.id,
            organizationId,
            function: 'user_can_manage_org_membership'
          });

          if (permissionError) {
            console.error('❌ Phase 2 FAILED: Permission check error:', permissionError);
            throw new Error(`Permission check failed: ${permissionError.message}`);
          }

          if (!canManage) {
            console.error('❌ Phase 2 FAILED: User lacks admin permissions');
            console.log('🔍 Checking raw membership data...');
            
            // Additional debugging: check raw membership
            const { data: rawMembership, error: rawError } = await supabase
              .from('organization_memberships')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('organization_id', organizationId)
              .single();

            console.log('📋 Raw Membership Check:', {
              rawMembership,
              rawError: rawError?.message,
              hasAdminRole: rawMembership?.role === 'admin'
            });

            throw new Error('You do not have admin permissions for this organisation. Please contact an administrator.');
          }

          console.log('✅ Phase 2 PASSED: User has admin permissions');

        } catch (dbError) {
          console.error('💥 Phase 2 Database Error:', dbError);
          throw dbError;
        }

        // PHASE 3: Database Invitation Creation
        console.log('🔍 PHASE 3: Database Invitation Creation');
        
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        console.log('📝 Creating invitation with data:', {
          email,
          organizationId,
          role,
          invitedBy: session.user.id,
          token: token.substring(0, 8) + '...',
          expiresAt: expiresAt.toISOString()
        });

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
          console.error('❌ Phase 3 FAILED: Database invitation creation error:', {
            error: dbError,
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            code: dbError.code
          });
          
          // Enhanced error messages
          if (dbError.message?.includes('permission denied')) {
            throw new Error('Database permission denied - RLS policy may be blocking access');
          } else if (dbError.message?.includes('violates row-level security')) {
            throw new Error('Row-level security violation - check your admin permissions');
          } else if (dbError.message?.includes('duplicate key')) {
            throw new Error('An invitation for this email already exists');
          } else {
            throw new Error(`Database error: ${dbError.message}`);
          }
        }
        
        console.log('✅ Phase 3 PASSED: Invitation created in database:', invitation?.id);

        // PHASE 4: Edge Function Email Sending
        console.log('🔍 PHASE 4: Email Sending via Edge Function');
        
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

        console.log('📧 Sending invitation email with data:', {
          to: email,
          organizationName: invitation.organizations?.name || 'your organization',
          inviterName,
          edgeFunctionName: 'send-team-invitation'
        });

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
          console.error('❌ Phase 4 WARNING: Email sending failed:', emailError);
          toast.error('Invitation created but email failed to send. You can resend it from the pending invitations list.');
          return invitation;
        } else {
          console.log('✅ Phase 4 PASSED: Invitation email sent successfully:', emailData);
        }
        
        console.log('🎉 === TEAM INVITATION DEBUG FLOW COMPLETE ===');
        return invitation;
        
      } catch (error) {
        console.error('❌ === INVITATION FLOW FAILED ===');
        console.error('💥 Final error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
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
      } else if (error.message?.includes('permission denied') || error.message?.includes('admin permissions')) {
        errorMessage = 'You do not have permission to invite members to this organisation';
      } else if (error.message?.includes('Row-level security')) {
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
