
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Organization, OrganizationWithRole } from '../types/organizations';
import { toast } from 'sonner';

export interface OrganizationContextType {
  currentOrganization: OrganizationWithRole | null;
  setCurrentOrganization: (org: OrganizationWithRole | null) => void;
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<boolean>;
  organizations: OrganizationWithRole[];
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, address?: string, urn?: string) => Promise<OrganizationWithRole | null>;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  setCurrentOrganization: () => {},
  isLoading: true,
  switchOrganization: async () => false,
  organizations: [],
  refreshOrganizations: async () => {},
  createOrganization: async () => null,
  error: null
});

export const useOrganization = () => useContext(OrganizationContext);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchOrganizations = async () => {
    if (!user) {
      console.log('OrganizationContext: No user found, returning empty organizations');
      return [];
    }
    
    console.log('OrganizationContext: Fetching organizations for user:', user.id);
    
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
        console.error('OrganizationContext: Error fetching organizations:', error);
        throw error;
      }

      console.log('OrganizationContext: Raw memberships data:', memberships);

      const organizations = memberships
        .filter(membership => membership.organizations)
        .map(membership => ({
          ...membership.organizations,
          role: membership.role
        })) as OrganizationWithRole[];
      
      console.log('OrganizationContext: Processed organizations:', organizations);
      return organizations;
    } catch (error) {
      console.error('OrganizationContext: Error in fetchOrganizations:', error);
      throw error;
    }
  };

  const refreshOrganizations = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('OrganizationContext: Error in refreshOrganizations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load organizations');
    }
  };

  const createOrganization = async (name: string, address?: string, urn?: string): Promise<OrganizationWithRole | null> => {
    if (!user) return null;
    
    setIsLoading(true);
    try {
      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          address: address || null,
          urn: urn || null,
        })
        .select('*')
        .single();
        
      if (orgError) {
        throw orgError;
      }
      
      // Add user as admin of the new organization
      const { error: membershipError } = await supabase
        .from('organization_memberships')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          role: 'admin',
          is_primary: true
        });
        
      if (membershipError) {
        throw membershipError;
      }
      
      // Create the OrganizationWithRole object
      const newOrg: OrganizationWithRole = {
        ...orgData,
        role: 'admin'
      };
      
      // Refresh organizations list
      await refreshOrganizations();
      
      // Set as current organization
      setCurrentOrganization(newOrg);
      
      return newOrg;
    } catch (error) {
      console.error('OrganizationContext: Error creating organization:', error);
      toast.error('Failed to create organisation');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchCurrentOrganization = async () => {
      console.log('OrganizationContext: Starting fetchCurrentOrganization, user:', user?.id);
      setIsLoading(true);
      setError(null);
      
      try {
        if (user) {
          console.log('OrganizationContext: User authenticated, fetching organizations');
          const orgs = await fetchOrganizations();
          setOrganizations(orgs);
          
          if (orgs.length === 0) {
            console.log('OrganizationContext: No organizations found for user');
            setError('You are not a member of any organization. Please contact your administrator to be added to an organization.');
            setCurrentOrganization(null);
          } else {
            // Set primary organization as current, or first available
            const primaryOrg = orgs.find(org => 
              org.role === 'admin' // Prefer admin role
            ) || orgs[0];
            
            console.log('OrganizationContext: Setting current organization:', primaryOrg);
            setCurrentOrganization(primaryOrg);
          }
        } else {
          console.log('OrganizationContext: No user, clearing organizations');
          setOrganizations([]);
          setCurrentOrganization(null);
        }
      } catch (error) {
        console.error('OrganizationContext: Error in fetchCurrentOrganization:', error);
        setError(error instanceof Error ? error.message : 'Failed to load organization data');
        setOrganizations([]);
        setCurrentOrganization(null);
      } finally {
        console.log('OrganizationContext: Finished loading, setting isLoading to false');
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
      console.error('OrganizationContext: Error switching organization:', error);
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
      refreshOrganizations,
      createOrganization,
      error
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};
