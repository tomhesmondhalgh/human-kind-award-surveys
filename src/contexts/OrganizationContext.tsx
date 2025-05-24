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
      // Try using the security definer function first
      const { data: userMemberships, error: membershipError } = await supabase
        .rpc('get_user_memberships', { user_uuid: user.id });

      if (membershipError) {
        console.error('OrganizationContext: Error with get_user_memberships function:', membershipError);
        // Fallback to direct query if function fails
        const { data: directMemberships, error: directError } = await supabase
          .from('organization_memberships')
          .select('*')
          .eq('user_id', user.id);
          
        if (directError) {
          console.error('OrganizationContext: Direct query also failed:', directError);
          throw new Error(`Database query failed: ${directError.message}`);
        }
        
        // Process direct memberships
        if (!directMemberships || directMemberships.length === 0) {
          console.log('OrganizationContext: No memberships found for user');
          return [];
        }
        
        // Get organization details separately
        const orgIds = directMemberships.map(m => m.organization_id);
        const { data: organizationsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds);
          
        if (orgsError) {
          throw new Error(`Failed to fetch organization details: ${orgsError.message}`);
        }
        
        const organizations = directMemberships
          .map(membership => {
            const org = organizationsData?.find(o => o.id === membership.organization_id);
            if (!org) return null;
            return {
              ...org,
              role: membership.role
            };
          })
          .filter(org => org !== null) as OrganizationWithRole[];
        
        console.log('OrganizationContext: Processed organizations from direct query:', organizations);
        return organizations;
      }

      // Process function result
      if (!userMemberships || userMemberships.length === 0) {
        console.log('OrganizationContext: No memberships found for user via function');
        return [];
      }

      // Get organization details for the memberships
      const orgIds = userMemberships.map((m: any) => m.organization_id);
      const { data: organizationsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);
        
      if (orgsError) {
        throw new Error(`Failed to fetch organization details: ${orgsError.message}`);
      }

      const organizations = userMemberships
        .map((membership: any) => {
          const org = organizationsData?.find((o: any) => o.id === membership.organization_id);
          if (!org) return null;
          return {
            ...org,
            role: membership.role
          };
        })
        .filter((org: any) => org !== null) as OrganizationWithRole[];
      
      console.log('OrganizationContext: Processed organizations from function:', organizations);
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
      console.log('OrganizationContext: Refreshing organizations...');
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);
      console.log('OrganizationContext: Organizations refreshed successfully');
    } catch (error) {
      console.error('OrganizationContext: Error in refreshOrganizations:', error);
      let errorMessage = 'Failed to load organizations';
      
      if (error instanceof Error) {
        if (error.message.includes('infinite recursion')) {
          errorMessage = 'Database configuration issue detected. Please contact support.';
        } else if (error.message.includes('policy')) {
          errorMessage = 'Permission denied. Please check your account access.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      console.error('OrganizationContext: Setting error:', errorMessage);
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
      
      // Clear any cached state
      sessionStorage.removeItem('actionPlanInitialized');
      
      try {
        if (user) {
          console.log('OrganizationContext: User authenticated, fetching organizations');
          const orgs = await fetchOrganizations();
          setOrganizations(orgs);
          
          if (orgs.length === 0) {
            console.log('OrganizationContext: No organizations found for user');
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
        let errorMessage = 'Failed to load organization data';
        
        if (error instanceof Error) {
          if (error.message.includes('infinite recursion')) {
            errorMessage = 'Database configuration issue detected. Please contact support.';
          } else if (error.message.includes('policy')) {
            errorMessage = 'Permission denied. Please check your account access.';
          } else {
            errorMessage = error.message;
          }
        }
        
        setError(errorMessage);
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
