
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Organization, OrganizationWithRole } from '../types/organizations';

export interface OrganizationContextType {
  currentOrganization: OrganizationWithRole | null;
  setCurrentOrganization: (org: OrganizationWithRole | null) => void;
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<boolean>;
  organizations: OrganizationWithRole[];
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  setCurrentOrganization: () => {},
  isLoading: true,
  switchOrganization: async () => false,
  organizations: [],
  refreshOrganizations: async () => {}
});

export const useOrganization = () => useContext(OrganizationContext);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrganizations = async () => {
    if (!user) return [];
    try {
      const { data: memberships, error } = await supabase
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

      if (error) {
        console.error('Error fetching organizations:', error);
        return [];
      }

      return memberships
        .filter(membership => membership.organizations)
        .map(membership => ({
          ...membership.organizations,
          role: membership.role
        })) as OrganizationWithRole[];
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }
  };

  const refreshOrganizations = async () => {
    if (!user) return;
    const orgs = await fetchOrganizations();
    setOrganizations(orgs);
  };

  useEffect(() => {
    const fetchCurrentOrganization = async () => {
      setIsLoading(true);
      try {
        if (user) {
          const orgs = await fetchOrganizations();
          setOrganizations(orgs);
          
          // Set primary organization as current, or first available
          const primaryOrg = orgs.find(org => 
            org.role === 'admin' // Prefer admin role
          ) || orgs[0];
          
          if (primaryOrg) {
            setCurrentOrganization(primaryOrg);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentOrganization();
  }, [user]);

  const switchOrganization = async (orgId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const targetOrg = organizations.find(org => org.id === orgId);
      if (targetOrg) {
        setCurrentOrganization(targetOrg);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error switching organization:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OrganizationContext.Provider value={{ 
      currentOrganization, 
      setCurrentOrganization, 
      isLoading, 
      switchOrganization,
      organizations,
      refreshOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};
