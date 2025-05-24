
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationWithRole } from '../types/organizations';

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
        // Use the new security definer function to bypass RLS issues
        const { data: organizationsData, error: orgError } = await supabase
          .rpc('get_user_organizations', { user_uuid: user.id });

        if (orgError) {
          throw orgError;
        }

        const orgsWithRoles = organizationsData?.map(org => ({
          id: org.id,
          name: org.name,
          address: org.address,
          urn: org.urn,
          created_at: org.created_at,
          updated_at: org.updated_at,
          role: org.role
        })) as OrganizationWithRole[] || [];

        setOrganizations(orgsWithRoles);
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
