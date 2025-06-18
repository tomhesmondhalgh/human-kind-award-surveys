
import { useState, useEffect } from 'react';
import { ProfileData } from '@/types/supabase-overrides';
import { queryTableWithIn } from '@/utils/supabaseHelpers';

export const useProfiles = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (userIds.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data, error } = await queryTableWithIn<ProfileData>(
          'profiles',
          '*',
          'id',
          userIds
        );

        if (error) {
          console.error('Error fetching profiles:', error);
          throw error;
        }

        setProfiles(data || []);
      } catch (err: any) {
        console.error('Error in fetchProfiles:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [userIds]);

  return { profiles, loading, error };
};
