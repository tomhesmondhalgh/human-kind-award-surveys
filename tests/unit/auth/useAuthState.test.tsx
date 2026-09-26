import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthState } from '@/utils/auth/useAuthState';

// Mock Supabase client
// vi.mock factories are hoisted above imports, so their data must be hoisted too.
const mockSupabase = vi.hoisted(() => ({
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

const makeSession = (id: string, updatedAt = '2026-09-26T00:00:00Z') => ({
  user: { id, email: `${id}@example.com`, updated_at: updatedAt },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

describe('useAuthState', () => {
  let authCallback: (event: string, session: unknown) => void;
  const unsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('starts in the loading state', () => {
    const { result } = renderHook(() => useAuthState());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.authCheckComplete).toBe(false);
  });

  it('loads a saved session', async () => {
    const session = makeSession('123');
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(session.user);
    expect(result.current.session).toEqual(session);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.authCheckComplete).toBe(true);
  });

  it('finishes loading signed out when the saved session cannot be read', async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error('storage blocked'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.authCheckComplete).toBe(true);
  });

  it('follows sign-in and sign-out events', async () => {
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const session = makeSession('456');
    act(() => authCallback('SIGNED_IN', session));
    expect(result.current.user).toEqual(session.user);
    expect(result.current.isAuthenticated).toBe(true);

    act(() => authCallback('SIGNED_OUT', null));
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('keeps the same user object across token refreshes', async () => {
    const first = makeSession('789');
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: first }, error: null });
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    const userBefore = result.current.user;

    const refreshed = makeSession('789');
    act(() => authCallback('TOKEN_REFRESHED', refreshed));
    expect(result.current.session).toBe(refreshed);
    expect(result.current.user).toBe(userBefore);

    const updated = makeSession('789', '2026-09-27T00:00:00Z');
    act(() => authCallback('USER_UPDATED', updated));
    expect(result.current.user).toBe(updated.user);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuthState());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
