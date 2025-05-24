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

        // Fixed query syntax: removed :user_id from profiles reference
        const { data, error } = await supabase
          .from('organization_memberships')
          .select(`
            *,
            profiles (
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
        
        const { data, error } = await supabase
          .from('organization_invitations')
          .insert({
            email,
            organization_id: organizationId,
            role: role as any,
            token,
            invited_by: session.user.id,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();
          
        if (error) {
          console.error('Invitation creation error:', error);
          throw error;
        }
        
        console.log('Invitation created successfully:', data);
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
    onError: (error: any) => {
      console.error('Invitation mutation error:', error);
      if (error.message?.includes('Not authenticated')) {
        toast.error('Authentication required - please refresh the page and log in again');
      } else {
        toast.error('Failed to send invitation');
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
    removeMember
  };
}
