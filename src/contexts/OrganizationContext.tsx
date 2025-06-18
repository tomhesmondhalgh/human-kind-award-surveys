
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationWithRole } from '../types/organizations';
import { queryTable, insertIntoTable } from '@/utils/supabaseHelpers';

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
  const { organizations, isLoading, error, refetch } = useOrganizations();

  const createOrganization = async (name: string, address?: string, urn?: string): Promise<OrganizationWithRole | null> => {
    if (!user) return null;

    try {
      // Create organization
      const { data: orgData, error: orgError } = await insertIntoTable('organizations', {
        name,
        address,
        urn
      });

      if (orgError || !orgData) {
        throw orgError || new Error('Failed to create organization');
      }

      // Create membership
      const { error: membershipError } = await insertIntoTable('organization_memberships', {
        user_id: user.id,
        organization_id: orgData.id,
        role: 'admin',
        is_primary: organizations.length === 0
      });

      if (membershipError) {
        throw membershipError;
      }

      // Refresh organizations list
      refetch();

      const newOrg: OrganizationWithRole = {
        ...orgData,
        role: 'admin' as any
      };

      setCurrentOrganization(newOrg);
      return newOrg;
    } catch (error) {
      console.error('Error creating organization:', error);
      return null;
    }
  };

  const refreshOrganizations = () => {
    refetch();
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
