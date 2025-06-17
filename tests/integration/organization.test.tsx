
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import Team from '@/pages/Team';
import { AuthContext } from '@/contexts/AuthContext';
import { OrganizationContext } from '@/contexts/OrganizationContext';

// Mock components and hooks
vi.mock('@/components/layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockAuthContext = {
  user: { id: 'user-1', email: 'admin@example.com' },
  isAuthenticated: true,
  authCheckComplete: true,
  isLoading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

const mockOrgContext = {
  currentOrganization: {
    id: 'org-1',
    name: 'Test School',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  organizations: [],
  isLoading: false,
  error: null,
  switchOrganization: vi.fn(),
  refetch: vi.fn(),
};

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    }),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({
        data: [
          {
            id: 'member-1',
            user_id: 'user-1',
            role: 'admin',
            profiles: {
              first_name: 'Admin',
              last_name: 'User',
              job_title: 'Headteacher',
            },
          },
        ],
        error: null,
      })),
    })),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <OrganizationContext.Provider value={mockOrgContext}>
            {children}
          </OrganizationContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Organization Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render team page with organization context', async () => {
    render(<Team />, { wrapper: createWrapper() });

    // Should show team management title
    expect(screen.getByText('Team Management')).toBeInTheDocument();

    // Should show current organization
    await waitFor(() => {
      expect(screen.getByText('Test School')).toBeInTheDocument();
    });

    // Should show current organization label
    expect(screen.getByText('Current Organisation')).toBeInTheDocument();
  });

  it('should display team stats correctly', async () => {
    render(<Team />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should show stats cards
      expect(screen.getByText('Total Members')).toBeInTheDocument();
      expect(screen.getByText('Administrators')).toBeInTheDocument();
      expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    });
  });

  it('should show invite button for admin users', async () => {
    render(<Team />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should show invite member button for admin
      expect(screen.getByText('Invite Member')).toBeInTheDocument();
    });
  });

  it('should handle no organization state', () => {
    const noOrgContext = {
      ...mockOrgContext,
      currentOrganization: null,
    };

    const WrapperWithNoOrg = ({ children }: { children: React.ReactNode }) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContext}>
              <OrganizationContext.Provider value={noOrgContext}>
                {children}
              </OrganizationContext.Provider>
            </AuthContext.Provider>
          </BrowserRouter>
        </QueryClientProvider>
      );
    };

    render(<Team />, { wrapper: WrapperWithNoOrg });

    // Should show no organisation message
    expect(screen.getByText('No organisation found')).toBeInTheDocument();
    expect(screen.getByText('Please contact support to set up your organisation.')).toBeInTheDocument();
  });
});
