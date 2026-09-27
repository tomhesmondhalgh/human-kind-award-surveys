import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSurveyForm } from '@/hooks/useSurveyForm';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

describe('useSurveyForm', () => {
  it('ignores a second submit while the first is still in flight', async () => {
    let finish!: (value: unknown) => void;
    invoke.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const navigate = vi.fn();
    const { result } = renderHook(() => useSurveyForm('11111111-1111-1111-1111-111111111111', false));

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.submitForm(navigate);
      second = result.current.submitForm(navigate);
    });
    expect(await second).toBe(false);

    await act(async () => {
      finish({ data: { success: true, response_id: 'r1' }, error: null });
      expect(await first).toBe(true);
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/survey-complete');
  });
});
