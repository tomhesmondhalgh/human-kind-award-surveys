
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
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_memberships')
          .select(`
            *,
            organizations:organization_id (
              id,
              name,
              address,
              urn,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id);

        if (membershipError) {
          throw membershipError;
        }

        const orgsWithRoles = memberships
          .filter(membership => membership.organizations)
          .map(membership => ({
            ...membership.organizations,
            role: membership.role
          })) as OrganizationWithRole[];

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
