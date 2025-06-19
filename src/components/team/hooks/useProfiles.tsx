
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../../contexts/AuthContext';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  created_at: string;
}

export const useProfiles = (organizationId: string | undefined) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!organizationId) {
        console.warn('Organization ID is undefined, skipping profile fetch.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            created_at
          `);

        if (error) {
          console.error('Error fetching profiles:', error);
          setError(error);
        } else {
          const transformedProfiles = (data || []).map(profile => ({
            ...profile,
            role: 'member' // Default role since we don't have this in profiles table
          }));
          setProfiles(transformedProfiles);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching profiles:', err);
        setError(new Error(err.message || 'An unexpected error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [organizationId, user]);

  return { profiles, isLoading, error };
};
