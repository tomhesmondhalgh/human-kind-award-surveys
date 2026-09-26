
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTeamMembers } from '@/components/team/hooks/useTeamMembers';
import React from 'react';

// Mock Supabase client
// vi.mock factories are hoisted above imports, so their data must be hoisted too.
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        error: null,
      })),
    })),
  })),
  functions: {
    invoke: vi.fn(),
  },
}));


vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTeamMembers('org-123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.members).toBeUndefined();
    expect(result.current.isInviteModalOpen).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch team members successfully', async () => {
    const mockMembers = [
      {
        id: '1',
        user_id: 'user-1',
        role: 'admin',
        profiles: {
          first_name: 'John',
          last_name: 'Doe',
          job_title: 'Headteacher',
        },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockMembers,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useTeamMembers('org-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members).toHaveLength(1);
    expect(result.current.members?.[0].profile?.first_name).toBe('John');
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Fetch failed');

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }),
    });

    const { result } = renderHook(() => useTeamMembers('org-123'), {
      wrapper: createWrapper(),
    });

    // The hook retries failed fetches twice (1s then 2s apart) before giving up.
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 5000 });

    expect(result.current.error).toEqual(mockError);
  }, 10000);

  it('should handle invite modal state', () => {
    const { result } = renderHook(() => useTeamMembers('org-123'), {
      wrapper: createWrapper(),
    });

    // Initially closed
    expect(result.current.isInviteModalOpen).toBe(false);

    // Open modal
    act(() => result.current.setIsInviteModalOpen(true));
    expect(result.current.isInviteModalOpen).toBe(true);

    // Close modal
    act(() => result.current.setIsInviteModalOpen(false));
    expect(result.current.isInviteModalOpen).toBe(false);
  });
});
