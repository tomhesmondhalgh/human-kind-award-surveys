
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrganizationMember } from '@/types/organizations';
import { selectQuery } from '@/lib/supabase/queryUtils';
import { ProfileData } from '@/types/supabase-overrides';

export function useProfiles(members: OrganizationMember[] | undefined) {
  const { 
    data: profiles, 
    isLoading: profilesLoading, 
    error: profilesError 
  } = useQuery({
    queryKey: ['userProfiles', members],
    queryFn: async () => {
      if (!members || members.length === 0) return [];
      
      const userIds = members.map(member => member.user_id);
      const { data, error } = await selectQuery<ProfileData>(
        'profiles',
        '*',
        { id: userIds }
      );
        
      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!members && members.length > 0
  });

  return {
    profiles,
    profilesLoading,
    profilesError
  };
}
