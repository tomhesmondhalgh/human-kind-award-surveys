
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationWithRole } from '../types/organizations';
import { queryTable } from '@/utils/supabaseHelpers';

interface OrganizationContextType {
  currentOrganization: OrganizationWithRole | null;
  setCurrentOrganization: (org: OrganizationWithRole | null) => void;
  organizations: OrganizationWithRole[];
  isLoading: boolean;
  error: Error | null;
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
  const { organizations, isLoading, error } = useOrganizations();

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
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
