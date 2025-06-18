
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Organization, OrganizationWithRole } from '../types/organizations';
import { toast } from 'sonner';
import { rpcQuery, insertQuery } from '@/lib/supabase/queryUtils';
import { OrganizationData } from '@/types/supabase-overrides';

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
  const { user, isAuthenticated } = useAuth();

  const fetchOrganizations = async () => {
    if (!user || !isAuthenticated) {
      console.log('OrganizationContext: No authenticated user, returning empty organizations');
      return [];
    }
    
    console.log('OrganizationContext: Fetching organizations for user:', user.id);
    
    try {
      // First verify session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('OrganizationContext: Invalid session:', sessionError);
        throw new Error('Authentication session invalid');
      }

      // Use the security definer function to get user organizations
      console.log('OrganizationContext: Calling get_user_organizations function...');
      const { data: organizationsData, error: orgError } = await rpcQuery<OrganizationData[]>(
        'get_user_organizations',
        { user_uuid: user.id }
      );

      if (orgError) {
        console.error('OrganizationContext: Error calling get_user_organizations:', orgError);
        console.error('OrganizationContext: Error details:', {
          code: orgError.code,
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint
        });
        
        // Check for specific RLS recursion errors
        if (orgError.message?.includes('infinite recursion') || orgError.message?.includes('recursion')) {
          throw new Error('Database configuration issue detected - please contact support');
        }
        
        throw new Error(`Failed to fetch organizations: ${orgError.message}`);
      }

      console.log('OrganizationContext: Raw organizations data:', organizationsData);

      if (!organizationsData || organizationsData.length === 0) {
        console.log('OrganizationContext: No organizations found for user');
        return [];
      }

      // Transform the data to match OrganizationWithRole interface
      const organizations = organizationsData.map(org => ({
        id: org.id,
        name: org.name,
        address: org.address,
        urn: org.urn,
        created_at: org.created_at,
        updated_at: org.updated_at,
        role: org.role as any
      })) as OrganizationWithRole[];
      
      console.log('OrganizationContext: Processed organizations successfully:', organizations.length, 'organizations');
      return organizations;
    } catch (error) {
      console.error('OrganizationContext: Error in fetchOrganizations:', error);
      throw error;
    }
  };

  const refreshOrganizations = async () => {
    if (!user || !isAuthenticated) {
      console.log('OrganizationContext: No authenticated user for refresh, skipping');
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
      
      let errorMessage = 'Failed to load organisations';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setOrganizations([]);
      
      // Only show toast for non-auth errors to avoid spam
      if (!errorMessage.includes('Authentication')) {
        toast.error(errorMessage);
      }
    }
  };

  const createOrganization = async (name: string, address?: string, urn?: string): Promise<OrganizationWithRole | null> => {
    if (!user || !isAuthenticated) {
      console.error('OrganizationContext: No authenticated user for organization creation');
      return null;
    }
    
    setIsLoading(true);
    try {
      console.log('OrganizationContext: Creating organization:', { name, address, urn });
      
      // Verify session before creating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication session invalid');
      }
      
      // Create the organization
      const { data: orgData, error: orgError } = await insertQuery<OrganizationData>(
        'organizations',
        {
          name,
          address: address || null,
          urn: urn || null,
        }
      );
        
      if (orgError) {
        console.error('OrganizationContext: Error creating organization:', orgError);
        throw orgError;
      }
      
      console.log('OrganizationContext: Organization created:', orgData);
      
      // Add user as admin of the new organization
      const { error: membershipError } = await insertQuery(
        'organization_memberships',
        {
          user_id: user.id,
          organization_id: orgData!.id,
          role: 'admin',
          is_primary: true
        }
      );
        
      if (membershipError) {
        console.error('OrganizationContext: Error creating membership:', membershipError);
        throw membershipError;
      }
      
      console.log('OrganizationContext: Membership created successfully');
      
      // Create the OrganizationWithRole object
      const newOrg: OrganizationWithRole = {
        ...orgData!,
        role: 'admin' as any
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
      console.log('OrganizationContext: Starting fetchCurrentOrganization, user:', user?.id, 'authenticated:', isAuthenticated);
      setIsLoading(true);
      setError(null);
      
      // Clear any cached state
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('actionPlanInitialized');
      }
      
      try {
        if (user && isAuthenticated) {
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
          console.log('OrganizationContext: No authenticated user, clearing organizations');
          setOrganizations([]);
          setCurrentOrganization(null);
        }
      } catch (error) {
        console.error('OrganizationContext: Error in fetchCurrentOrganization:', error);
        
        let errorMessage = 'Failed to load organisation data';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        setOrganizations([]);
        setCurrentOrganization(null);
        
        // Only show toast for non-auth errors
        if (!errorMessage.includes('Authentication')) {
          toast.error(errorMessage);
        }
      } finally {
        console.log('OrganizationContext: Finished loading, setting isLoading to false');
        setIsLoading(false);
      }
    };

    // Only fetch if we have a definitive auth state (not still loading)
    if (user !== undefined) {
      fetchCurrentOrganization();
    }
  }, [user, isAuthenticated]);

  const switchOrganization = async (orgId: string): Promise<boolean> => {
    console.log('OrganizationContext: Switching to organization:', orgId);
    setIsLoading(true);
    try {
      const targetOrg = organizations.find(org => org.id === orgId);
      if (targetOrg) {
        console.log('OrganizationContext: Found target organization:', targetOrg);
        setCurrentOrganization(targetOrg);
        // Clear action plan cache when switching organizations
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('actionPlanInitialized');
        }
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
