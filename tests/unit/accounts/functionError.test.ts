import { describe, expect, it } from 'vitest';
import { functionErrorMessage, readFunctionErrorBody } from '@/utils/functionError';

const httpError = (body: unknown, status = 400) => ({
  message: 'Edge Function returned a non-2xx status code',
  context: new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
});

describe('readFunctionErrorBody', () => {
  it("reads the function's JSON reply from error.context", async () => {
    const body = await readFunctionErrorBody(httpError({ error: 'This invitation has expired' }));
    expect(body?.error).toBe('This invitation has expired');
  });

  it('keeps extra fields such as emailMismatch', async () => {
    const body = await readFunctionErrorBody(httpError({ error: 'x', emailMismatch: true }, 403));
    expect(body?.emailMismatch).toBe(true);
  });

  it('returns null for errors without a response', async () => {
    expect(await readFunctionErrorBody(new Error('Failed to fetch'))).toBeNull();
    expect(await readFunctionErrorBody(null)).toBeNull();
  });
});

describe('functionErrorMessage', () => {
  it('prefers the function message, then the error message, then the fallback', async () => {
    expect(await functionErrorMessage(httpError({ error: 'Specific' }), 'fallback')).toBe('Specific');
    expect(await functionErrorMessage(new Error('Network down'), 'fallback')).toBe('Network down');
    expect(await functionErrorMessage({}, 'fallback')).toBe('fallback');
  });
});
