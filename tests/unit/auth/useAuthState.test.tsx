
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthState } from '@/utils/auth/useAuthState';

// Mock Supabase client
const mockSupabase = {
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('useAuthState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuthState());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.authCheckComplete).toBe(false);
  });

  it('should handle successful session retrieval', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockSession.user);
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.authCheckComplete).toBe(true);
  });

  it('should handle session error', async () => {
    const mockError = new Error('Session error');

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.authError).toEqual(mockError);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.authCheckComplete).toBe(true);
  });

  it('should handle auth state changes', async () => {
    let authCallback: any;
    
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuthState());

    // Simulate auth state change
    const newSession = {
      user: { id: '456', email: 'new@example.com' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    authCallback('SIGNED_IN', newSession);

    await waitFor(() => {
      expect(result.current.session).toEqual(newSession);
    });

    expect(result.current.user).toEqual(newSession.user);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
