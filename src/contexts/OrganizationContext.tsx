
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationWithRole } from '../types/organizations';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationContextType {
  currentOrganization: OrganizationWithRole | null;
  setCurrentOrganization: (org: OrganizationWithRole | null) => void;
  organizations: OrganizationWithRole[];
  isLoading: boolean;
  error: Error | null;
  createOrganization: (name: string, address?: string, urn?: string) => Promise<OrganizationWithRole | null>;
  refreshOrganizations: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null);
  const { user } = useAuth();
  const { organizations, isLoading, error, refetch: refreshOrganizations } = useOrganizations();

  const createOrganization = async (name: string, address?: string, urn?: string): Promise<OrganizationWithRole | null> => {
    if (!user) return null;

    try {
      // Create organization using direct Supabase call
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          address,
          urn
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      if (!orgData) {
        throw new Error('Failed to create organization');
      }

      // Create membership using direct Supabase call
      const { error: membershipError } = await supabase
        .from('organization_memberships')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          role: 'admin',
          is_primary: organizations.length === 0
        });

      if (membershipError) {
        throw membershipError;
      }

      // Refresh organizations list
      refreshOrganizations();

      // Create new org object with proper typings
      const newOrg: OrganizationWithRole = {
        ...orgData,
        role: 'admin'
      };

      setCurrentOrganization(newOrg);
      return newOrg;
    } catch (error) {
      console.error('Error creating organization:', error);
      return null;
    }
  };

  // Set the current organization when organizations are loaded
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      // Get stored organization from localStorage or default to first one
      const storedOrgId = localStorage.getItem('currentOrganizationId');
      const targetOrg = storedOrgId 
        ? organizations.find(org => org.id === storedOrgId)
        : organizations[0];
      
      if (targetOrg) {
        setCurrentOrganization(targetOrg);
      }
    }
  }, [organizations, currentOrganization]);

  // Save current organization to localStorage when it changes
  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('currentOrganizationId', currentOrganization.id);
    }
  }, [currentOrganization]);

  // Clear current organization when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentOrganization(null);
      localStorage.removeItem('currentOrganizationId');
    }
  }, [user]);

  const value = {
    currentOrganization,
    setCurrentOrganization,
    organizations,
    isLoading,
    error,
    createOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
