import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Organization } from '../types/organizations';

export interface OrganizationWithRole extends Organization {
  role: string;
  id: string;
}

export const useOrganizations = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    const fetchOrganizations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // In the simplified model, we just use the user's profile as their organization
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('school_name')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        // Create an organization entry based on user's profile
        const personalOrg: OrganizationWithRole = {
          id: user.id,
          name: profile?.school_name || 'My Organisation',
          created_at: new Date().toISOString(),
          role: 'administrator'
        };

        setOrganizations([personalOrg]);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError(err instanceof Error ? err : new Error('Unknown error loading organizations'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, [user]);

  return { organizations, isLoading, error };
};
