
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Organization } from '../types/organizations';

export interface OrganizationContextType {
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization | null) => void;
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<boolean>;
  organizations: Organization[];
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
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrganizations = async () => {
    if (!user) return [];
    try {
      // Since organization_members table doesn't exist in the DB schema,
      // we'll use a simplified approach
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, school_name, created_at, updated_at')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching organization data:', error);
        return [];
      }
      
      if (profile) {
        return [{
          id: profile.id,
          name: profile.school_name || 'My Organisation',
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString()
        }];
      }
      
      return [];
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
    const fetchOrganization = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // Use the user's profile as the organization
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, school_name, created_at, updated_at')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching organization profile:', error);
            setIsLoading(false);
            return;
          }

          if (profile) {
            setCurrentOrganization({
              id: profile.id,
              name: profile.school_name || 'My Organisation',
              created_at: profile.created_at || new Date().toISOString(),
              updated_at: profile.updated_at || new Date().toISOString()
            });
          }
          
          // Fetch all organizations for the user
          const orgs = await fetchOrganizations();
          setOrganizations(orgs);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [user]);

  const switchOrganization = async (orgId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Fetch organization details
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, school_name, created_at, updated_at')
        .eq('id', orgId)
        .single();

      if (error) {
        console.error('Error fetching organization profile:', error);
        setIsLoading(false);
        return false;
      }

      if (!profile) {
        console.error('Organization not found');
        setIsLoading(false);
        return false;
      }

      setCurrentOrganization({
        id: profile.id,
        name: profile.school_name || 'My Organisation',
        created_at: profile.created_at || new Date().toISOString(),
        updated_at: profile.updated_at || new Date().toISOString()
      });
      return true;
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
