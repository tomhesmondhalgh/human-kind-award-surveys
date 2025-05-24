
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
      // First, try to get user memberships directly
      console.log('OrganizationContext: Querying organization_memberships table...');
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('OrganizationContext: Error fetching memberships:', membershipError);
        throw new Error(`Failed to fetch user memberships: ${membershipError.message}`);
      }

      console.log('OrganizationContext: Found memberships:', memberships);

      if (!memberships || memberships.length === 0) {
        console.log('OrganizationContext: No memberships found for user');
        return [];
      }

      // Get organization details for the memberships
      const orgIds = memberships.map(m => m.organization_id);
      console.log('OrganizationContext: Fetching organization details for IDs:', orgIds);
      
      const { data: organizationsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);
        
      if (orgsError) {
        console.error('OrganizationContext: Error fetching organizations:', orgsError);
        throw new Error(`Failed to fetch organization details: ${orgsError.message}`);
      }

      console.log('OrganizationContext: Found organizations:', organizationsData);

      // Combine membership and organization data
      const organizations = memberships
        .map(membership => {
          const org = organizationsData?.find(o => o.id === membership.organization_id);
          if (!org) {
            console.warn('OrganizationContext: Organization not found for membership:', membership);
            return null;
          }
          return {
            ...org,
            role: membership.role
          };
        })
        .filter(org => org !== null) as OrganizationWithRole[];
      
      console.log('OrganizationContext: Processed organizations:', organizations);
      return organizations;
    } catch (error) {
      console.error('OrganizationContext: Error in fetchOrganizations:', error);
      throw error;
    }
  };

  const refreshOrganizations = async () => {
    if (!user) {
      console.log('OrganizationContext: No user for refresh, skipping');
      return;
    }
    
    try {
      setError(null);
      console.log('OrganizationContext: Refreshing organizations...');
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);
      console.log('OrganizationContext: Organizations refreshed successfully, count:', orgs.length);
    } catch (error) {
      console.error('OrganizationContext: Error in refreshOrganizations:', error);
      
      let errorMessage = 'Failed to load organizations';
      
      if (error instanceof Error) {
        const errorString = error.message.toLowerCase();
        
        if (errorString.includes('infinite recursion')) {
          errorMessage = 'Database policy error detected. Please contact support if this persists.';
        } else if (errorString.includes('policy')) {
          errorMessage = 'Permission denied. Please check your account access or contact support.';
        } else if (errorString.includes('network') || errorString.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      setOrganizations([]);
      toast.error(errorMessage);
    }
  };

  const createOrganization = async (name: string, address?: string, urn?: string): Promise<OrganizationWithRole | null> => {
    if (!user) {
      console.error('OrganizationContext: No user found for organization creation');
      return null;
    }
    
    setIsLoading(true);
    try {
      console.log('OrganizationContext: Creating organization:', { name, address, urn });
      
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
        console.error('OrganizationContext: Error creating organization:', orgError);
        throw orgError;
      }
      
      console.log('OrganizationContext: Organization created:', orgData);
      
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
        console.error('OrganizationContext: Error creating membership:', membershipError);
        throw membershipError;
      }
      
      console.log('OrganizationContext: Membership created successfully');
      
      // Create the OrganizationWithRole object
      const newOrg: OrganizationWithRole = {
        ...orgData,
        role: 'admin'
      };
      
      // Refresh organizations list
      await refreshOrganizations();
      
      // Set as current organization
      setCurrentOrganization(newOrg);
      
      console.log('OrganizationContext: Organization creation completed successfully');
      return newOrg;
    } catch (error) {
      console.error('OrganizationContext: Error in createOrganization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organisation';
      toast.error(`Failed to create organisation: ${errorMessage}`);
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
          const errorString = error.message.toLowerCase();
          
          if (errorString.includes('infinite recursion')) {
            errorMessage = 'Database policy error detected. Please contact support if this persists.';
          } else if (errorString.includes('policy')) {
            errorMessage = 'Permission denied. Please check your account access or contact support.';
          } else if (errorString.includes('network') || errorString.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = `Error: ${error.message}`;
          }
        }
        
        setError(errorMessage);
        setOrganizations([]);
        setCurrentOrganization(null);
        toast.error(errorMessage);
      } finally {
        console.log('OrganizationContext: Finished loading, setting isLoading to false');
        setIsLoading(false);
      }
    };

    fetchCurrentOrganization();
  }, [user]);

  const switchOrganization = async (orgId: string): Promise<boolean> => {
    console.log('OrganizationContext: Switching to organization:', orgId);
    setIsLoading(true);
    try {
      const targetOrg = organizations.find(org => org.id === orgId);
      if (targetOrg) {
        console.log('OrganizationContext: Found target organization:', targetOrg);
        setCurrentOrganization(targetOrg);
        // Clear action plan cache when switching organizations
        sessionStorage.removeItem('actionPlanInitialized');
        return true;
      }
      console.warn('OrganizationContext: Target organization not found in user organizations');
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
